package com.example.patientmicroservice.dto;

import java.util.List;
import java.util.Map;

public class PatientProfileUpdateRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private String dateOfBirth;
    private String gender;
    private String bloodType;
    private List<Map<String, Object>> allergies;
    private Map<String, Object> emergencyContact;
    private List<Map<String, Object>> medicalHistory;
    private List<Map<String, Object>> currentMedications;

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public String getBloodType() {
        return bloodType;
    }

    public List<Map<String, Object>> getAllergies() {
        return allergies;
    }

    public Map<String, Object> getEmergencyContact() {
        return emergencyContact;
    }

    public List<Map<String, Object>> getMedicalHistory() {
        return medicalHistory;
    }

    public List<Map<String, Object>> getCurrentMedications() {
        return currentMedications;
    }
}
