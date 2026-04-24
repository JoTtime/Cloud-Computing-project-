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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
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

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            @Value("${medconnect.appointment.default-location:Clinic}") String defaultLocation,
            @Value("${medconnect.appointment.day-start:09:00}") String dayStart,
            @Value("${medconnect.appointment.day-end:17:00}") String dayEnd,
            @Value("${medconnect.appointment.slot-duration-minutes:30}") int slotDurationMinutes
    ) {
        this.appointmentRepository = appointmentRepository;
        this.defaultLocation = defaultLocation;
        this.dayStart = LocalTime.parse(dayStart);
        this.dayEnd = LocalTime.parse(dayEnd);
        this.slotDurationMinutes = slotDurationMinutes;
    }

    public AvailabilityDto getDoctorAvailability(String doctorId, String date) {
        LocalDate appointmentDate = parseDate(date);
        List<AppointmentEntity> existing = appointmentRepository
                .findByDoctorIdAndAppointmentDateAndStatusNotInOrderByStartTimeAsc(doctorId, appointmentDate, NON_BLOCKING_STATUSES);

        List<TimeSlotDto> slots = generateSlots(existing);
        String dayName = appointmentDate.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH);
        return new AvailabilityDto(date, dayName, slots, slotDurationMinutes, defaultLocation);
    }

    public AppointmentDto bookAppointment(AuthenticatedUser user, BookAppointmentRequest request) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can book appointments");
        }
        LocalDate date = parseDate(request.getDate());
        LocalTime startTime = parseTime(request.getStartTime(), "startTime");
        LocalTime endTime = parseTime(request.getEndTime(), "endTime");
        validateDateRange(date, startTime, endTime);

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
        appointment.setLocation(defaultLocation);
        appointment.setConnection(null);

        return AppointmentDto.fromEntity(appointmentRepository.save(appointment));
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

    public AppointmentDto getAppointmentById(AuthenticatedUser user, String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        boolean isOwner = user.userId().equals(appointment.getPatientId()) || user.userId().equals(appointment.getDoctorId());
        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this appointment");
        }

        return AppointmentDto.fromEntity(appointment);
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
        return AppointmentDto.fromEntity(appointmentRepository.save(appointment));
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

    private void validateDateRange(LocalDate date, LocalTime startTime, LocalTime endTime) {
        if (date.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book appointments in the past");
        }
        if (!endTime.isAfter(startTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        if (startTime.isBefore(dayStart) || endTime.isAfter(dayEnd)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment time is outside working hours");
        }
        if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointments are only available Monday to Friday");
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

    private List<TimeSlotDto> generateSlots(List<AppointmentEntity> existing) {
        List<TimeSlotDto> slots = new java.util.ArrayList<>();
        LocalTime cursor = dayStart;
        while (cursor.plusMinutes(slotDurationMinutes).compareTo(dayEnd) <= 0) {
            LocalTime end = cursor.plusMinutes(slotDurationMinutes);
            LocalTime slotStart = cursor;
            LocalTime slotEnd = end;
            boolean available = existing.stream().noneMatch(apt ->
                    apt.getStartTime().isBefore(slotEnd) && apt.getEndTime().isAfter(slotStart));
            slots.add(new TimeSlotDto(cursor.format(HH_MM), end.format(HH_MM), available));
            cursor = end;
        }
        return slots;
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
}
