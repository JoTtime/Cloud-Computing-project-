package com.example.billingmicroservice.dto;

import com.example.billingmicroservice.model.InvoiceEntity;

import java.time.format.DateTimeFormatter;

public record InvoiceDto(
        String _id,
        String invoiceNumber,
        String appointmentId,
        String doctorId,
        String patientId,
        long amount,
        String currency,
        String status,
        String issuedAt
) {
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static InvoiceDto fromEntity(InvoiceEntity entity) {
        return new InvoiceDto(
                entity.getId(),
                entity.getInvoiceNumber(),
                entity.getAppointmentId(),
                entity.getDoctorId(),
                entity.getPatientId(),
                entity.getAmount() == null ? 0L : entity.getAmount(),
                entity.getCurrency(),
                entity.getStatus(),
                entity.getIssuedAt().format(DATETIME_FMT)
        );
    }
}
