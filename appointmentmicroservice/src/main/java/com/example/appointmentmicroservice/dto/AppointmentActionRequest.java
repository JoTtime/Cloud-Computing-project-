package com.example.appointmentmicroservice.dto;

import jakarta.validation.constraints.NotBlank;

public class AppointmentActionRequest {

    @NotBlank
    private String action;

    private String rejectionReason;

    public String getAction() {
        return action;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}
