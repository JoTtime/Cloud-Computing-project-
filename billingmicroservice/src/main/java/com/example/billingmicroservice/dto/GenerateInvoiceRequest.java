package com.example.billingmicroservice.dto;

import jakarta.validation.constraints.NotBlank;

public class GenerateInvoiceRequest {
    @NotBlank
    private String appointmentId;

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }
}
