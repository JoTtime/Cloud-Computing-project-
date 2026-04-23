package com.example.appointmentmicroservice.service;

import com.example.appointmentmicroservice.dto.AppointmentActionRequest;
import com.example.appointmentmicroservice.dto.AppointmentDto;
import com.example.appointmentmicroservice.dto.AvailabilityDto;
import com.example.appointmentmicroservice.dto.BookAppointmentRequest;
import com.example.appointmentmicroservice.dto.TimeSlotDto;
import com.example.appointmentmicroservice.model.AppointmentEntity;
import com.example.appointmentmicroservice.model.AppointmentStatus;
import com.example.appointmentmicroservice.model.AppointmentType;
import com.example.appointmentmicroservice.repository.AppointmentRepository;
import com.example.appointmentmicroservice.security.AuthenticatedUser;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AppointmentService {

    private static final Set<AppointmentStatus> NON_BLOCKING_STATUSES = Set.of(AppointmentStatus.cancelled, AppointmentStatus.rejected);
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final String defaultLocation;
    private final LocalTime dayStart;
    private final LocalTime dayEnd;
    private final int slotDurationMinutes;
    private final String doctorServiceUrl;
    private final String userServiceUrl;
    private final RestTemplate restTemplate;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            @Value("${medconnect.appointment.default-location:Clinic}") String defaultLocation,
            @Value("${medconnect.appointment.day-start:09:00}") String dayStart,
            @Value("${medconnect.appointment.day-end:17:00}") String dayEnd,
            @Value("${medconnect.appointment.slot-duration-minutes:30}") int slotDurationMinutes,
            @Value("${medconnect.doctor-service.url:http://localhost:8082}") String doctorServiceUrl,
            @Value("${medconnect.user-service.url:http://localhost:8086}") String userServiceUrl
    ) {
        this.appointmentRepository = appointmentRepository;
        this.defaultLocation = defaultLocation;
        this.dayStart = LocalTime.parse(dayStart);
        this.dayEnd = LocalTime.parse(dayEnd);
        this.slotDurationMinutes = slotDurationMinutes;
        this.doctorServiceUrl = doctorServiceUrl;
        this.userServiceUrl = userServiceUrl;
        this.restTemplate = new RestTemplate();
    }

    public AvailabilityDto getDoctorAvailability(String doctorId, String date) {
        LocalDate appointmentDate = parseDate(date);
        DoctorAvailabilityConfig doctorAvailability = fetchDoctorAvailabilityConfig(doctorId);
        List<AppointmentEntity> existing = appointmentRepository
                .findByDoctorIdAndAppointmentDateAndStatusNotInOrderByStartTimeAsc(doctorId, appointmentDate, NON_BLOCKING_STATUSES);

        List<TimeSlotDto> slots = generateSlots(existing, appointmentDate, doctorAvailability);
        String dayName = appointmentDate.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH);
        return new AvailabilityDto(
                date,
                dayName,
                slots,
                doctorAvailability.slotDurationMinutes(),
                doctorAvailability.location()
        );
    }

    public String getAppointmentStatus(String appointmentId) {
        return appointmentRepository.findById(appointmentId)
                .map(apt -> apt.getStatus().name())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
    }

    public AppointmentDto bookAppointment(AuthenticatedUser user, BookAppointmentRequest request) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can book appointments");
        }
        LocalDate date = parseDate(request.getDate());
        LocalTime startTime = parseTime(request.getStartTime(), "startTime");
        LocalTime endTime = parseTime(request.getEndTime(), "endTime");
        DoctorAvailabilityConfig doctorAvailability = fetchDoctorAvailabilityConfig(request.getDoctorId());
        validateDateRange(date, startTime, endTime, doctorAvailability);

        ensureNoConflictsForDoctor(request.getDoctorId(), date, startTime, endTime);
        ensureNoConflictsForPatient(user.userId(), date, startTime, endTime);

        AppointmentEntity appointment = new AppointmentEntity();
        appointment.setPatientId(user.userId());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setAppointmentDate(date);
        appointment.setStartTime(startTime);
        appointment.setEndTime(endTime);
        appointment.setType(AppointmentType.fromApiValue(request.getType()));
        appointment.setReason(request.getReason().trim());
        appointment.setNotes(request.getNotes());
        appointment.setStatus(AppointmentStatus.pending);
        appointment.setLocation(doctorAvailability.location());
        appointment.setConnection(null);

        AppointmentEntity saved = appointmentRepository.save(appointment);
        notifyAppointmentRequest(saved);
        return AppointmentDto.fromEntity(saved);
    }

    public List<AppointmentDto> getPatientAppointments(AuthenticatedUser user, String status) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can access patient appointments");
        }

        List<AppointmentEntity> data = status == null || status.isBlank()
                ? appointmentRepository.findByPatientIdOrderByAppointmentDateAscStartTimeAsc(user.userId())
                : appointmentRepository.findByPatientIdAndStatusOrderByAppointmentDateAscStartTimeAsc(user.userId(), parseStatus(status));

        return data.stream().map(AppointmentDto::fromEntity).toList();
    }

    public List<AppointmentDto> getDoctorAppointments(AuthenticatedUser user, String status, String date) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can access doctor appointments");
        }

        List<AppointmentEntity> data;
        if (date != null && !date.isBlank()) {
            LocalDate localDate = parseDate(date);
            if (status != null && !status.isBlank()) {
                data = appointmentRepository.findByDoctorIdAndAppointmentDateAndStatusOrderByStartTimeAsc(
                        user.userId(), localDate, parseStatus(status)
                );
            } else {
                data = appointmentRepository.findByDoctorIdAndAppointmentDateOrderByStartTimeAsc(user.userId(), localDate);
            }
        } else if (status != null && !status.isBlank()) {
            data = appointmentRepository.findByDoctorIdAndStatusOrderByAppointmentDateAscStartTimeAsc(user.userId(), parseStatus(status));
        } else {
            data = appointmentRepository.findByDoctorIdOrderByAppointmentDateAscStartTimeAsc(user.userId());
        }
        return data.stream().map(AppointmentDto::fromEntity).toList();
    }

    public AppointmentDto respondToAppointment(AuthenticatedUser user, String appointmentId, AppointmentActionRequest request) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can respond to appointment requests");
        }
        AppointmentEntity appointment = loadOwnedDoctorAppointment(user.userId(), appointmentId);
        if (appointment.getStatus() != AppointmentStatus.pending) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending appointments can be responded to");
        }

        String action = request.getAction().toLowerCase(Locale.ENGLISH);
        if ("accept".equals(action)) {
            appointment.setStatus(AppointmentStatus.confirmed);
            appointment.setCancelReason(null);
        } else if ("reject".equals(action)) {
            appointment.setStatus(AppointmentStatus.rejected);
            appointment.setCancelReason(
                    request.getRejectionReason() == null || request.getRejectionReason().isBlank()
                            ? "Rejected by doctor"
                            : request.getRejectionReason().trim()
            );
            appointment.setCancelledBy(user.userId());
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action must be either accept or reject");
        }
        AppointmentEntity saved = appointmentRepository.save(appointment);
        if ("accept".equals(action)) {
            notifyAppointmentStatus(saved, "APPOINTMENT_CONFIRMED", "Your appointment has been accepted by the doctor.");
        } else {
            notifyAppointmentStatus(saved, "APPOINTMENT_REJECTED", "Your appointment request was rejected by the doctor.");
        }
        return AppointmentDto.fromEntity(saved);
    }

    public AppointmentDto cancelAppointment(AuthenticatedUser user, String appointmentId, String reason) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        boolean canCancel = user.userId().equals(appointment.getPatientId()) || user.userId().equals(appointment.getDoctorId());
        if (!canCancel) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to cancel this appointment");
        }

        if (appointment.getStatus() == AppointmentStatus.cancelled
                || appointment.getStatus() == AppointmentStatus.completed
                || appointment.getStatus() == AppointmentStatus.rejected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment cannot be cancelled in its current state");
        }

        appointment.setStatus(AppointmentStatus.cancelled);
        appointment.setCancelledBy(user.userId());
        appointment.setCancelReason(reason == null || reason.isBlank() ? "Cancelled by user" : reason.trim());
        return AppointmentDto.fromEntity(appointmentRepository.save(appointment));
    }

    private void validateDateRange(LocalDate date, LocalTime startTime, LocalTime endTime, DoctorAvailabilityConfig config) {
        LocalDateTime now = LocalDateTime.now();
        if (date.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book appointments in the past");
        }
        if (date.isEqual(now.toLocalDate()) && !startTime.isAfter(now.toLocalTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book a time slot that has already started");
        }
        if (!endTime.isAfter(startTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        long requestedDuration = ChronoUnit.MINUTES.between(startTime, endTime);
        if (requestedDuration != config.slotDurationMinutes()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected time range does not match doctor's slot duration");
        }
        List<TimeRange> windows = config.windowsFor(date.getDayOfWeek());
        if (windows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Doctor is not available on this day");
        }
        boolean insideAnyWindow = windows.stream().anyMatch(window ->
                !startTime.isBefore(window.start()) && !endTime.isAfter(window.end()));
        if (!insideAnyWindow) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected time is outside doctor's available schedule");
        }
    }

    private void ensureNoConflictsForDoctor(String doctorId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        List<AppointmentEntity> conflicts = appointmentRepository
                .findByDoctorIdAndAppointmentDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNotIn(
                        doctorId, date, endTime, startTime, NON_BLOCKING_STATUSES
                );
        if (!conflicts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected time slot is no longer available");
        }
    }

    private void ensureNoConflictsForPatient(String patientId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        List<AppointmentEntity> conflicts = appointmentRepository
                .findByPatientIdAndAppointmentDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNotIn(
                        patientId, date, endTime, startTime, NON_BLOCKING_STATUSES
                );
        if (!conflicts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have an appointment at this time");
        }
    }

    private AppointmentEntity loadOwnedDoctorAppointment(String doctorId, String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (!doctorId.equals(appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this appointment");
        }
        return appointment;
    }

    private List<TimeSlotDto> generateSlots(List<AppointmentEntity> existing, LocalDate date, DoctorAvailabilityConfig config) {
        List<TimeSlotDto> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        boolean isToday = date.isEqual(now.toLocalDate());
        List<TimeRange> windows = config.windowsFor(date.getDayOfWeek());
        for (TimeRange window : windows) {
            LocalTime cursor = window.start();
            while (cursor.plusMinutes(config.slotDurationMinutes()).compareTo(window.end()) <= 0) {
                LocalTime end = cursor.plusMinutes(config.slotDurationMinutes());
                LocalTime slotStart = cursor;
                LocalTime slotEnd = end;
                boolean available = existing.stream().noneMatch(apt ->
                        apt.getStartTime().isBefore(slotEnd) && apt.getEndTime().isAfter(slotStart));
                if (isToday && !slotStart.isAfter(now.toLocalTime())) {
                    available = false;
                }
                slots.add(new TimeSlotDto(cursor.format(HH_MM), end.format(HH_MM), available));
                cursor = end;
            }
        }
        return slots;
    }

    @SuppressWarnings("unchecked")
    private DoctorAvailabilityConfig fetchDoctorAvailabilityConfig(String doctorId) {
        try {
            String url = doctorServiceUrl + "/api/doctors/" + doctorId + "/availability-config";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) {
                return DoctorAvailabilityConfig.defaultConfig(dayStart, dayEnd, slotDurationMinutes, defaultLocation);
            }
            Object availabilityRaw = response.get("availability");
            if (!(availabilityRaw instanceof Map<?, ?> availabilityMap)) {
                return DoctorAvailabilityConfig.defaultConfig(dayStart, dayEnd, slotDurationMinutes, defaultLocation);
            }

            Object scheduleRaw = availabilityMap.get("schedule");
            Map<String, List<TimeRange>> schedule = parseSchedule(scheduleRaw);

            // If doctor has no schedule configured, use the global default
            if (schedule.isEmpty()) {
                return DoctorAvailabilityConfig.defaultConfig(dayStart, dayEnd, slotDurationMinutes, defaultLocation);
            }

            int configuredSlotDuration = parsePositiveInt(availabilityMap.get("slotDuration"), slotDurationMinutes);
            String location = availabilityMap.get("location") == null || availabilityMap.get("location").toString().isBlank()
                    ? defaultLocation
                    : availabilityMap.get("location").toString().trim();

            return new DoctorAvailabilityConfig(schedule, configuredSlotDuration, location);
        } catch (Exception ignored) {
            return DoctorAvailabilityConfig.defaultConfig(dayStart, dayEnd, slotDurationMinutes, defaultLocation);
        }
    }

    private Map<String, List<TimeRange>> parseSchedule(Object scheduleRaw) {
        Map<String, List<TimeRange>> schedule = new LinkedHashMap<>();
        if (!(scheduleRaw instanceof Map<?, ?> scheduleMap)) {
            return schedule;
        }
        for (Map.Entry<?, ?> entry : scheduleMap.entrySet()) {
            String dayKey = entry.getKey() == null ? "" : entry.getKey().toString().toLowerCase(Locale.ENGLISH);
            List<TimeRange> parsedRanges = new ArrayList<>();
            if (entry.getValue() instanceof List<?> ranges) {
                for (Object rangeRaw : ranges) {
                    if (rangeRaw instanceof Map<?, ?> rangeMap) {
                        String start = rangeMap.get("start") == null ? null : rangeMap.get("start").toString();
                        String end = rangeMap.get("end") == null ? null : rangeMap.get("end").toString();
                        if (start != null && end != null) {
                            try {
                                LocalTime startTime = LocalTime.parse(start, HH_MM);
                                LocalTime endTime = LocalTime.parse(end, HH_MM);
                                if (endTime.isAfter(startTime)) {
                                    parsedRanges.add(new TimeRange(startTime, endTime));
                                }
                            } catch (Exception ignored) {
                                // Ignore invalid range values and continue parsing.
                            }
                        }
                    }
                }
            }
            schedule.put(dayKey, parsedRanges);
        }
        return schedule;
    }

    private int parsePositiveInt(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            int parsed = Integer.parseInt(value.toString());
            return parsed > 0 ? parsed : fallback;
        } catch (Exception ex) {
            return fallback;
        }
    }

    private LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Expected YYYY-MM-DD");
        }
    }

    private LocalTime parseTime(String value, String fieldName) {
        try {
            return LocalTime.parse(value, HH_MM);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be in HH:mm format");
        }
    }

    private AppointmentStatus parseStatus(String status) {
        try {
            return AppointmentStatus.valueOf(status.toLowerCase(Locale.ENGLISH));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status filter: " + status);
        }
    }

    private void notifyAppointmentRequest(AppointmentEntity appointment) {
        notify(
                appointment.getDoctorId(),
                appointment.getPatientId(),
                "APPOINTMENT_REQUEST",
                "You have a new appointment request.",
                appointment
        );
    }

    private void notifyAppointmentStatus(AppointmentEntity appointment, String type, String message) {
        notify(
                appointment.getPatientId(),
                appointment.getDoctorId(),
                type,
                message,
                appointment
        );
    }

    private void notify(String recipientId, String senderId, String type, String message, AppointmentEntity appointment) {
        try {
            String url = userServiceUrl + "/api/notifications/appointments";
            Map<String, Object> payload = Map.of(
                    "recipientId", recipientId,
                    "senderId", senderId,
                    "type", type,
                    "message", message,
                    "appointmentId", appointment.getId(),
                    "appointmentStatus", appointment.getStatus().name(),
                    "appointmentDate", appointment.getAppointmentDate().toString()
            );
            restTemplate.postForObject(url, payload, Map.class);
        } catch (Exception ignored) {
            // Notifications should not block appointment creation or response.
        }
    }

    private record TimeRange(LocalTime start, LocalTime end) {}

    private record DoctorAvailabilityConfig(
            Map<String, List<TimeRange>> schedule,
            int slotDurationMinutes,
            String location
    ) {
        List<TimeRange> windowsFor(DayOfWeek dayOfWeek) {
            String key = dayOfWeek.name().toLowerCase(Locale.ENGLISH);
            return schedule.getOrDefault(key, List.of());
        }

        static DoctorAvailabilityConfig defaultConfig(
                LocalTime dayStart,
                LocalTime dayEnd,
                int slotDuration,
                String location
        ) {
            Map<String, List<TimeRange>> defaultSchedule = Map.of(
                    "monday", List.of(new TimeRange(dayStart, dayEnd)),
                    "tuesday", List.of(new TimeRange(dayStart, dayEnd)),
                    "wednesday", List.of(new TimeRange(dayStart, dayEnd)),
                    "thursday", List.of(new TimeRange(dayStart, dayEnd)),
                    "friday", List.of(new TimeRange(dayStart, dayEnd))
            );
            return new DoctorAvailabilityConfig(defaultSchedule, slotDuration, location);
        }
    }
}
