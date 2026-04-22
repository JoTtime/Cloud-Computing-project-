package com.example.appointmentmicroservice.dto;

import com.example.appointmentmicroservice.model.AppointmentEntity;

import java.time.format.DateTimeFormatter;
import java.util.Map;

public record AppointmentDto(
        String _id,
        Object patient,
        Object doctor,
        String connection,
        String date,
        String startTime,
        String endTime,
        String type,
        String reason,
        String notes,
        String status,
        String location,
        String cancelReason,
        String cancelledBy,
        String createdAt,
        String updatedAt
) {
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static AppointmentDto fromEntity(AppointmentEntity entity) {
        return new AppointmentDto(
                entity.getId(),
                Map.of("_id", entity.getPatientId()),
                Map.of("_id", entity.getDoctorId()),
                entity.getConnection(),
                entity.getAppointmentDate().format(DATE_FMT),
                entity.getStartTime().format(TIME_FMT),
                entity.getEndTime().format(TIME_FMT),
                entity.getType().toApiValue(),
                entity.getReason(),
                entity.getNotes(),
                entity.getStatus().name(),
                entity.getLocation(),
                entity.getCancelReason(),
                entity.getCancelledBy(),
                entity.getCreatedAt().format(DATETIME_FMT),
                entity.getUpdatedAt().format(DATETIME_FMT)
        );
    }
}
