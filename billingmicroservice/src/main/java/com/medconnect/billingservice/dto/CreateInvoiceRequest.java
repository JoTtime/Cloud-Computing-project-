package com.medconnect.billingservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateInvoiceRequest {

    @NotBlank
    private String patientId;

    @NotBlank
    private String patientName;

    @NotBlank
    private String doctorName;

    private String appointmentId;

    /** Used to auto-calculate amount from pricing rules */
    private String consultationType;

    @NotBlank
    private String description;

    /** Explicit amount — required if consultationType not provided */
    private Double amount;

    private Double tax = 0.0;
    private String dueDate;
    private String notes;

    public String getPatientId() { return patientId; }
    public void setPatientId(String v) { this.patientId = v; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String v) { this.patientName = v; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String v) { this.doctorName = v; }

    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String v) { this.appointmentId = v; }

    public String getConsultationType() { return consultationType; }
    public void setConsultationType(String v) { this.consultationType = v; }

    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }

    public Double getAmount() { return amount; }
    public void setAmount(Double v) { this.amount = v; }

    public Double getTax() { return tax; }
    public void setTax(Double v) { this.tax = v; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String v) { this.dueDate = v; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
