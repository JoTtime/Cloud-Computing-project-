package com.medconnect.billingservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 36)
    private String patientId;

    @Column(nullable = false, length = 36)
    private String doctorId;

    @Column(length = 36)
    private String appointmentId;

    @Column(nullable = false)
    private String patientName;

    @Column(nullable = false)
    private String doctorName;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private Double tax = 0.0;

    @Column(nullable = false)
    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status = InvoiceStatus.unpaid;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    private LocalDateTime paidAt;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        totalAmount = (amount != null ? amount : 0.0) + (tax != null ? tax : 0.0);
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        totalAmount = (amount != null ? amount : 0.0) + (tax != null ? tax : 0.0);
    }

    public enum InvoiceStatus { unpaid, paid, cancelled, refunded }
    public enum PaymentMethod  { cash, card, insurance, online }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String v) { this.patientId = v; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String v) { this.doctorId = v; }

    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String v) { this.appointmentId = v; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String v) { this.patientName = v; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String v) { this.doctorName = v; }

    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }

    public Double getAmount() { return amount; }
    public void setAmount(Double v) { this.amount = v; }

    public Double getTax() { return tax; }
    public void setTax(Double v) { this.tax = v; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double v) { this.totalAmount = v; }

    public InvoiceStatus getStatus() { return status; }
    public void setStatus(InvoiceStatus v) { this.status = v; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod v) { this.paymentMethod = v; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime v) { this.paidAt = v; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime v) { this.dueDate = v; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
