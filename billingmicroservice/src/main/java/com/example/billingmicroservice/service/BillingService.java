package com.example.billingmicroservice.service;

import com.example.billingmicroservice.dto.InvoiceDto;
import com.example.billingmicroservice.model.InvoiceEntity;
import com.example.billingmicroservice.repository.InvoiceRepository;
import com.example.billingmicroservice.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BillingService {
    private static final String FCFA = "FCFA";
    private static final DateTimeFormatter DATE_CODE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final InvoiceRepository invoiceRepository;
    private final RestTemplate restTemplate;
    private final String appointmentApiUrl;
    private final String doctorApiUrl;
    private final long defaultConsultationFeeFcfa;

    public BillingService(
            InvoiceRepository invoiceRepository,
            @Value("${medconnect.services.appointment-api-url:http://localhost:8087/api}") String appointmentApiUrl,
            @Value("${medconnect.services.doctor-api-url:http://localhost:8088/api}") String doctorApiUrl,
            @Value("${medconnect.billing.default-consultation-fee-fcfa:25000}") long defaultConsultationFeeFcfa
    ) {
        this.invoiceRepository = invoiceRepository;
        this.restTemplate = new RestTemplate();
        this.appointmentApiUrl = appointmentApiUrl;
        this.doctorApiUrl = doctorApiUrl;
        this.defaultConsultationFeeFcfa = defaultConsultationFeeFcfa;
    }

    public InvoiceDto generateInvoice(AuthenticatedUser user, String authorization, String appointmentId) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can generate invoices");
        }

        InvoiceEntity existing = invoiceRepository.findByAppointmentId(appointmentId).orElse(null);
        if (existing != null) {
            ensureOwner(existing, user);
            return InvoiceDto.fromEntity(existing);
        }

        Map<String, Object> appointment = loadAppointment(authorization, appointmentId);
        String doctorId = extractNestedId(appointment, "doctor");
        String patientId = extractNestedId(appointment, "patient");
        String appointmentStatus = String.valueOf(appointment.getOrDefault("status", "")).toLowerCase();
        if ("cancelled".equals(appointmentStatus) || "rejected".equals(appointmentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot generate invoice for cancelled or rejected appointments");
        }
        if (!user.userId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only bill your own appointments");
        }

        Map<String, Object> doctor = loadDoctor(authorization, doctorId);
        long amountFcfa = readConsultationFee(doctor, doctorId);

        InvoiceEntity invoice = new InvoiceEntity();
        invoice.setInvoiceNumber("INV-" + LocalDate.now().format(DATE_CODE) + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invoice.setAppointmentId(appointmentId);
        invoice.setDoctorId(doctorId);
        invoice.setPatientId(patientId);
        invoice.setAmount(amountFcfa);
        invoice.setCurrency(FCFA);
        invoice.setStatus("issued");
        invoice.setIssuedAt(LocalDateTime.now());
        return InvoiceDto.fromEntity(invoiceRepository.save(invoice));
    }

    public List<InvoiceDto> getMyInvoices(AuthenticatedUser user) {
        List<InvoiceEntity> data = user.isDoctor()
                ? invoiceRepository.findByDoctorIdOrderByIssuedAtDesc(user.userId())
                : invoiceRepository.findByPatientIdOrderByIssuedAtDesc(user.userId());
        return data.stream().map(InvoiceDto::fromEntity).toList();
    }

    public InvoiceDto payInvoice(AuthenticatedUser user, String invoiceId) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can pay invoices");
        }

        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        if (!user.userId().equals(invoice.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invoice does not belong to your account");
        }

        if ("paid".equalsIgnoreCase(invoice.getStatus())) {
            return InvoiceDto.fromEntity(invoice);
        }

        invoice.setStatus("paid");
        return InvoiceDto.fromEntity(invoiceRepository.save(invoice));
    }

    private void ensureOwner(InvoiceEntity invoice, AuthenticatedUser user) {
        boolean allowed = user.userId().equals(invoice.getDoctorId()) || user.userId().equals(invoice.getPatientId());
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invoice does not belong to your account");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadAppointment(String authorization, String appointmentId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.AUTHORIZATION, authorization);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    appointmentApiUrl + "/appointments/" + appointmentId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );
            Map<String, Object> payload = response.getBody();
            if (payload == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Appointment service returned an empty response");
            }
            Object appointment = payload.get("appointment");
            if (!(appointment instanceof Map<?, ?> appointmentMap)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment payload is invalid");
            }
            return (Map<String, Object>) appointmentMap;
        } catch (RestClientResponseException ex) {
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            throw new ResponseStatusException(
                    status == null ? HttpStatus.BAD_GATEWAY : status,
                    "Unable to load appointment for invoicing: " + ex.getStatusText()
            );
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cannot reach appointment service at " + appointmentApiUrl + ". Is it running?"
            );
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadDoctor(String authorization, String doctorId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.AUTHORIZATION, authorization);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    doctorApiUrl + "/doctors/" + doctorId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );
            Map<String, Object> payload = response.getBody();
            if (payload == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Doctor service returned an empty response");
            }
            Object doctor = payload.get("doctor");
            if (!(doctor instanceof Map<?, ?> doctorMap)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Doctor payload is invalid");
            }
            return (Map<String, Object>) doctorMap;
        } catch (RestClientResponseException ex) {
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            throw new ResponseStatusException(
                    status == null ? HttpStatus.BAD_GATEWAY : status,
                    "Unable to load doctor profile for invoicing: " + ex.getStatusText()
            );
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cannot reach doctor service at " + doctorApiUrl + ". Is it running?"
            );
        }
    }

    @SuppressWarnings("unchecked")
    private String extractNestedId(Map<String, Object> source, String key) {
        Object nested = source.get(key);
        if (!(nested instanceof Map<?, ?> nestedMap)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing " + key + " reference");
        }
        Map<String, Object> map = (Map<String, Object>) nestedMap;
        Object id = map.get("_id");
        if ((id == null || (id instanceof String s && s.isBlank())) && map.get("id") != null) {
            id = map.get("id");
        }
        if (id instanceof String idValue && !idValue.isBlank()) {
            return idValue;
        }
        if (id instanceof Number number) {
            String asText = number.toString();
            if (!asText.isBlank()) {
                return asText;
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing " + key + " id");
    }

    private long readConsultationFee(Map<String, Object> doctor, String doctorId) {
        Object fee = doctor.get("consultationFee");
        Long parsed = parsePositiveFee(fee);
        if (parsed != null && parsed > 0) {
            return parsed;
        }
        if (defaultConsultationFeeFcfa > 0) {
            return defaultConsultationFeeFcfa;
        }
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Doctor consultation fee is not set (doctorId=" + doctorId + "). "
                        + "Set it in Account Settings (FCFA) or configure medconnect.billing.default-consultation-fee-fcfa."
        );
    }

    private static Long parsePositiveFee(Object fee) {
        if (fee == null) {
            return null;
        }
        if (fee instanceof Number number) {
            return Math.round(number.doubleValue());
        }
        if (fee instanceof String text) {
            try {
                String trimmed = text.trim();
                if (trimmed.isEmpty()) {
                    return null;
                }
                return Math.round(Double.parseDouble(trimmed));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
