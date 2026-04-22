package com.example.patientmicroservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patients")
public class PatientEntity {

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

    @Column(length = 40)
    private String dateOfBirth;

    @Column(length = 20)
    private String gender;

    @Column(length = 10)
    private String bloodType;

    @Column(columnDefinition = "TEXT")
    private String allergiesJson;

    @Column(columnDefinition = "TEXT")
    private String emergencyContactJson;

    @Column(columnDefinition = "TEXT")
    private String medicalHistoryJson;

    @Column(columnDefinition = "TEXT")
    private String currentMedicationsJson;

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

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public String getAllergiesJson() {
        return allergiesJson;
    }

    public void setAllergiesJson(String allergiesJson) {
        this.allergiesJson = allergiesJson;
    }

    public String getEmergencyContactJson() {
        return emergencyContactJson;
    }

    public void setEmergencyContactJson(String emergencyContactJson) {
        this.emergencyContactJson = emergencyContactJson;
    }

    public String getMedicalHistoryJson() {
        return medicalHistoryJson;
    }

    public void setMedicalHistoryJson(String medicalHistoryJson) {
        this.medicalHistoryJson = medicalHistoryJson;
    }

    public String getCurrentMedicationsJson() {
        return currentMedicationsJson;
    }

    public void setCurrentMedicationsJson(String currentMedicationsJson) {
        this.currentMedicationsJson = currentMedicationsJson;
    }
}
