package com.example.usermicroservice.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class NotificationEntity {
    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 36)
    private String recipientId;

    @Column(nullable = false, length = 36)
    private String senderId;

    @Column(nullable = false, length = 64)
    private String type;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private boolean isRead;

    @Column(length = 36)
    private String relatedConnectionId;

    @Column(length = 20)
    private String relatedConnectionStatus;

    @Column(length = 36)
    private String relatedAppointmentId;

    @Column(length = 20)
    private String relatedAppointmentStatus;

    private String relatedAppointmentDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public String getRelatedConnectionId() { return relatedConnectionId; }
    public void setRelatedConnectionId(String relatedConnectionId) { this.relatedConnectionId = relatedConnectionId; }
    public String getRelatedConnectionStatus() { return relatedConnectionStatus; }
    public void setRelatedConnectionStatus(String relatedConnectionStatus) { this.relatedConnectionStatus = relatedConnectionStatus; }
    public String getRelatedAppointmentId() { return relatedAppointmentId; }
    public void setRelatedAppointmentId(String relatedAppointmentId) { this.relatedAppointmentId = relatedAppointmentId; }
    public String getRelatedAppointmentStatus() { return relatedAppointmentStatus; }
    public void setRelatedAppointmentStatus(String relatedAppointmentStatus) { this.relatedAppointmentStatus = relatedAppointmentStatus; }
    public String getRelatedAppointmentDate() { return relatedAppointmentDate; }
    public void setRelatedAppointmentDate(String relatedAppointmentDate) { this.relatedAppointmentDate = relatedAppointmentDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}