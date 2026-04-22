package com.example.appointmentmicroservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class BookAppointmentRequest {

    @NotBlank
    private String doctorId;

    @NotBlank
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "date must be in YYYY-MM-DD format")
    private String date;

    @NotBlank
    @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "startTime must be in HH:mm format")
    private String startTime;

    @NotBlank
    @Pattern(regexp = "^\\d{2}:\\d{2}$", message = "endTime must be in HH:mm format")
    private String endTime;

    @NotBlank
    private String type;

    @NotBlank
    private String reason;

    private String notes;

    public String getDoctorId() {
        return doctorId;
    }

    public String getDate() {
        return date;
    }

    public String getStartTime() {
        return startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public String getType() {
        return type;
    }

    public String getReason() {
        return reason;
    }

    public String getNotes() {
        return notes;
    }
}
