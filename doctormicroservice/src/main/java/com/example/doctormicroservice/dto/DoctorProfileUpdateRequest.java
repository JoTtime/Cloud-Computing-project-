package com.example.doctormicroservice.dto;

import java.util.Map;

public class DoctorProfileUpdateRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String specialty;
    private String phone;
    private String hospital;
    private Integer yearsOfExperience;
    private Double consultationFee;
    private String bio;
    private Availability availability;

    public static class Availability {
        private Map<String, Object> schedule;
        private Integer slotDuration;
        private String location;

        public Map<String, Object> getSchedule() {
            return schedule;
        }

        public Integer getSlotDuration() {
            return slotDuration;
        }

        public String getLocation() {
            return location;
        }
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getSpecialty() {
        return specialty;
    }

    public String getPhone() {
        return phone;
    }

    public String getHospital() {
        return hospital;
    }

    public Integer getYearsOfExperience() {
        return yearsOfExperience;
    }

    public Double getConsultationFee() {
        return consultationFee;
    }

    public String getBio() {
        return bio;
    }

    public Availability getAvailability() {
        return availability;
    }
}
