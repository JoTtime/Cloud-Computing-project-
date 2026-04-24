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
    private List<Map<String, Object>> vitals;
    private String doctorNotes;

    public String getFirstName() {
        return firstName;
    }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() {
        return lastName;
    }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() {
        return email;
    }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() {
        return phone;
    }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() {
        return address;
    }
    public void setAddress(String address) { this.address = address; }

    public String getDateOfBirth() {
        return dateOfBirth;
    }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() {
        return gender;
    }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodType() {
        return bloodType;
    }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public List<Map<String, Object>> getAllergies() {
        return allergies;
    }
    public void setAllergies(List<Map<String, Object>> allergies) { this.allergies = allergies; }

    public Map<String, Object> getEmergencyContact() {
        return emergencyContact;
    }
    public void setEmergencyContact(Map<String, Object> emergencyContact) { this.emergencyContact = emergencyContact; }

    public List<Map<String, Object>> getMedicalHistory() {
        return medicalHistory;
    }
    public void setMedicalHistory(List<Map<String, Object>> medicalHistory) { this.medicalHistory = medicalHistory; }

    public List<Map<String, Object>> getCurrentMedications() {
        return currentMedications;
    }
    public void setCurrentMedications(List<Map<String, Object>> currentMedications) { this.currentMedications = currentMedications; }

    public List<Map<String, Object>> getVitals() {
        return vitals;
    }
    public void setVitals(List<Map<String, Object>> vitals) { this.vitals = vitals; }

    public String getDoctorNotes() {
        return doctorNotes;
    }
    public void setDoctorNotes(String doctorNotes) { this.doctorNotes = doctorNotes; }
}
