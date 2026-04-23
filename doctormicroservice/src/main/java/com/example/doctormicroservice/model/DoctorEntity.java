package com.example.doctormicroservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "doctors")
public class DoctorEntity {

    @Id
    @Column(length = 64, nullable = false, updatable = false)
    private String id;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(length = 300)
    private String address;

    @Column(length = 120)
    private String specialty;

    @Column(length = 160)
    private String hospital;

    private Integer yearsOfExperience;
    private Double consultationFee;
    private Double rating;
    private Integer reviewCount;
    private Boolean availableToday;
    private Boolean isVerified;

    @Column(length = 1500)
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String availabilityScheduleJson;

    private Integer availabilitySlotDuration;

    @Column(length = 120)
    private String availabilityLocation;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (rating == null) {
            rating = 0.0;
        }
        if (reviewCount == null) {
            reviewCount = 0;
        }
        if (availableToday == null) {
            availableToday = true;
        }
        if (isVerified == null) {
            isVerified = false;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getHospital() {
        return hospital;
    }

    public void setHospital(String hospital) {
        this.hospital = hospital;
    }

    public Integer getYearsOfExperience() {
        return yearsOfExperience;
    }

    public void setYearsOfExperience(Integer yearsOfExperience) {
        this.yearsOfExperience = yearsOfExperience;
    }

    public Double getConsultationFee() {
        return consultationFee;
    }

    public void setConsultationFee(Double consultationFee) {
        this.consultationFee = consultationFee;
    }

    public Double getRating() {
        return rating;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public Boolean getAvailableToday() {
        return availableToday;
    }

    public void setAvailableToday(Boolean availableToday) {
        this.availableToday = availableToday;
    }

    public Boolean getIsVerified() {
        return isVerified;
    }

    public void setIsVerified(Boolean verified) {
        isVerified = verified;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvailabilityScheduleJson() {
        return availabilityScheduleJson;
    }

    public void setAvailabilityScheduleJson(String availabilityScheduleJson) {
        this.availabilityScheduleJson = availabilityScheduleJson;
    }

    public Integer getAvailabilitySlotDuration() {
        return availabilitySlotDuration;
    }

    public void setAvailabilitySlotDuration(Integer availabilitySlotDuration) {
        this.availabilitySlotDuration = availabilitySlotDuration;
    }

    public String getAvailabilityLocation() {
        return availabilityLocation;
    }

    public void setAvailabilityLocation(String availabilityLocation) {
        this.availabilityLocation = availabilityLocation;
    }
}
