package com.medconnect.billingservice.service;

import com.medconnect.billingservice.dto.CreateInvoiceRequest;
import com.medconnect.billingservice.dto.CampayInitiateRequest;
import com.medconnect.billingservice.dto.PayInvoiceRequest;
import com.medconnect.billingservice.entity.Invoice;
import com.medconnect.billingservice.entity.PricingRule;
import com.medconnect.billingservice.repository.InvoiceRepository;
import com.medconnect.billingservice.repository.PricingRuleRepository;
import com.medconnect.billingservice.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BillingService {

    private final InvoiceRepository invoiceRepo;
    private final PricingRuleRepository pricingRepo;
    private final AppointmentClient appointmentClient;
    private final CampayService campayService;

    public BillingService(InvoiceRepository invoiceRepo,
                          PricingRuleRepository pricingRepo,
                          AppointmentClient appointmentClient,
                          CampayService campayService) {
        this.invoiceRepo = invoiceRepo;
        this.pricingRepo = pricingRepo;
        this.appointmentClient = appointmentClient;
        this.campayService = campayService;
    }

    // ── POST /billing — create invoice ───────────────────────────────────────

    @Transactional
    public Invoice createInvoice(AuthenticatedUser doctor, CreateInvoiceRequest req) {
        if (!"doctor".equalsIgnoreCase(doctor.getUserType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can create invoices");
        }

        // Validate appointment status if appointmentId provided
        if (req.getAppointmentId() != null && !req.getAppointmentId().isBlank()) {
            String status = appointmentClient.getAppointmentStatus(req.getAppointmentId());

            // Block invoices only for cancelled/rejected appointments
            if ("cancelled".equalsIgnoreCase(status) || "rejected".equalsIgnoreCase(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot create invoice for a cancelled or rejected appointment");
            }
            // Prevent duplicate invoice for same appointment
            invoiceRepo.findByAppointmentId(req.getAppointmentId()).ifPresent(i -> {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invoice already exists for this appointment");
            });
        }

        Invoice invoice = new Invoice();
        invoice.setDoctorId(doctor.getUserId());
        invoice.setPatientId(req.getPatientId());
        invoice.setPatientName(req.getPatientName());
        invoice.setDoctorName(req.getDoctorName());
        invoice.setAppointmentId(req.getAppointmentId());
        invoice.setDescription(req.getDescription());
        invoice.setNotes(req.getNotes());

        // Rule: calculate amount from pricing rules if consultationType provided
        if (req.getConsultationType() != null && !req.getConsultationType().isBlank()) {
            PricingRule rule = pricingRepo.findByConsultationType(req.getConsultationType())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "No pricing rule found for: " + req.getConsultationType()));
            invoice.setAmount(rule.calculateFinalAmount());
            invoice.setTax(rule.calculateTax());
        } else if (req.getAmount() != null && req.getAmount() > 0) {
            invoice.setAmount(req.getAmount());
            invoice.setTax(req.getTax() != null ? req.getTax() : 0.0);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Provide either 'amount' or 'consultationType'");
        }

        if (req.getDueDate() != null && !req.getDueDate().isBlank()) {
            invoice.setDueDate(LocalDateTime.parse(req.getDueDate()));
        }

        return invoiceRepo.save(invoice);
    }

    // ── GET /billing — view invoices ─────────────────────────────────────────

    public List<Invoice> getMyInvoices(AuthenticatedUser user, String status) {
        if ("doctor".equalsIgnoreCase(user.getUserType())) {
            return status != null && !status.isBlank()
                    ? invoiceRepo.findByDoctorIdAndStatus(user.getUserId(), Invoice.InvoiceStatus.valueOf(status))
                    : invoiceRepo.findByDoctorId(user.getUserId());
        } else {
            return status != null && !status.isBlank()
                    ? invoiceRepo.findByPatientIdAndStatus(user.getUserId(), Invoice.InvoiceStatus.valueOf(status))
                    : invoiceRepo.findByPatientId(user.getUserId());
        }
    }

    public Invoice getInvoiceById(AuthenticatedUser user, String id) {
        Invoice inv = invoiceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        if (!inv.getPatientId().equals(user.getUserId()) && !inv.getDoctorId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return inv;
    }

    // ── PUT /billing/pay — mark invoice as paid ───────────────────────────────

    @Transactional
    public Invoice payInvoice(AuthenticatedUser patient, String id, PayInvoiceRequest req) {
        Invoice inv = invoiceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        if (!inv.getPatientId().equals(patient.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your invoice");
        }
        // Rule: cannot pay an already paid invoice
        if (inv.getStatus() != Invoice.InvoiceStatus.unpaid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invoice is already " + inv.getStatus().name());
        }

        inv.setStatus(Invoice.InvoiceStatus.paid);
        inv.setPaymentMethod(Invoice.PaymentMethod.valueOf(req.getPaymentMethod().toLowerCase()));
        inv.setPaidAt(LocalDateTime.now());
        return invoiceRepo.save(inv);
    }

    @Transactional
    public Map<String, Object> initiateCampayPayment(AuthenticatedUser patient, String id, CampayInitiateRequest req) {
        Invoice inv = invoiceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        if (!inv.getPatientId().equals(patient.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your invoice");
        }
        if (inv.getStatus() != Invoice.InvoiceStatus.unpaid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invoice is already " + inv.getStatus().name());
        }

        String externalReference = "inv-" + inv.getId() + "-" + System.currentTimeMillis();
        Map<String, Object> response = campayService.initiatePayment(
                inv.getTotalAmount(),
                req.getPhoneNumber(),
                req.getOperator(),
                "Payment for invoice " + inv.getId(),
                externalReference
        );

        String providerReference = extractReference(response, externalReference);
        inv.setNotes((inv.getNotes() == null ? "" : inv.getNotes() + " | ") + "campay_ref=" + providerReference);
        invoiceRepo.save(inv);

        Map<String, Object> payload = new HashMap<>();
        payload.put("invoiceId", inv.getId());
        payload.put("reference", providerReference);
        payload.put("providerResponse", response);
        payload.put("message", "Campay payment initiated. Approve the mobile money prompt on your phone.");
        return payload;
    }

    @Transactional
    public Map<String, Object> verifyCampayPayment(AuthenticatedUser patient, String id, String reference) {
        Invoice inv = invoiceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        if (!inv.getPatientId().equals(patient.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your invoice");
        }
        if (inv.getStatus() == Invoice.InvoiceStatus.paid) {
            return Map.of("paid", true, "invoice", inv, "status", "ALREADY_PAID");
        }

        Map<String, Object> verification = campayService.verifyTransaction(reference);
        String status = String.valueOf(verification.getOrDefault("status", "")).toUpperCase();
        boolean paid = "SUCCESSFUL".equals(status) || "SUCCESS".equals(status) || "COMPLETED".equals(status);

        if (paid) {
            inv.setStatus(Invoice.InvoiceStatus.paid);
            inv.setPaymentMethod(Invoice.PaymentMethod.online);
            inv.setPaidAt(LocalDateTime.now());
            inv.setNotes((inv.getNotes() == null ? "" : inv.getNotes() + " | ") + "campay_ref=" + reference);
            invoiceRepo.save(inv);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("paid", paid);
        payload.put("status", status);
        payload.put("invoice", inv);
        payload.put("providerResponse", verification);
        return payload;
    }

    private String extractReference(Map<String, Object> providerResponse, String fallbackReference) {
        Object[] keys = {"reference", "operator_reference", "external_reference", "transaction_id"};
        for (Object key : keys) {
            Object value = providerResponse.get(String.valueOf(key));
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value);
            }
        }
        return fallbackReference;
    }

    // ── Cancel invoice ────────────────────────────────────────────────────────

    @Transactional
    public Invoice cancelInvoice(AuthenticatedUser doctor, String id) {
        Invoice inv = invoiceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        if (!inv.getDoctorId().equals(doctor.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your invoice");
        }
        if (inv.getStatus() == Invoice.InvoiceStatus.paid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel a paid invoice");
        }
        inv.setStatus(Invoice.InvoiceStatus.cancelled);
        return invoiceRepo.save(inv);
    }

    // ── GET /billing/rules — view pricing rules ───────────────────────────────

    public List<PricingRule> getPricingRules() {
        return pricingRepo.findAll();
    }

    // ── GET /billing stats ────────────────────────────────────────────────────

    public Map<String, Object> getDoctorStats(AuthenticatedUser doctor) {
        if (!"doctor".equalsIgnoreCase(doctor.getUserType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doctors only");
        }
        Double earned = invoiceRepo.sumPaidByDoctorId(doctor.getUserId());
        Long pending  = invoiceRepo.countUnpaidByDoctorId(doctor.getUserId());
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEarned",    earned  != null ? earned  : 0.0);
        stats.put("pendingInvoices", pending != null ? pending : 0L);
        return stats;
    }
}
