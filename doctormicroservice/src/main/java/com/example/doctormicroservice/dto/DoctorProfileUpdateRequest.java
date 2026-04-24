package com.example.doctormicroservice.dto;

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
    private String availabilityScheduleJson;
    private Integer slotDuration;
    private String availabilityLocation;

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

    public String getSpecialty() {
        return specialty;
    }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getPhone() {
        return phone;
    }
    public void setPhone(String phone) { this.phone = phone; }

    public String getHospital() {
        return hospital;
    }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public Integer getYearsOfExperience() {
        return yearsOfExperience;
    }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public Double getConsultationFee() {
        return consultationFee;
    }
    public void setConsultationFee(Double consultationFee) { this.consultationFee = consultationFee; }

    public String getBio() {
        return bio;
    }
    public void setBio(String bio) { this.bio = bio; }

    public String getAvailabilityScheduleJson() {
        return availabilityScheduleJson;
    }
    public void setAvailabilityScheduleJson(String availabilityScheduleJson) { this.availabilityScheduleJson = availabilityScheduleJson; }

    public Integer getSlotDuration() {
        return slotDuration;
    }
    public void setSlotDuration(Integer slotDuration) { this.slotDuration = slotDuration; }

    public String getAvailabilityLocation() {
        return availabilityLocation;
    }
    public void setAvailabilityLocation(String availabilityLocation) { this.availabilityLocation = availabilityLocation; }
}
