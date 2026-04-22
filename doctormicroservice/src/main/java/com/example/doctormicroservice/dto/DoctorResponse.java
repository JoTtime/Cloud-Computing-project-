package com.example.doctormicroservice.dto;

import java.util.List;
import java.util.Map;

public class DoctorResponse {
    private final boolean success;
    private final String message;
    private final DoctorDto doctor;
    private final List<DoctorDto> doctors;
    private final Map<String, Object> user;

    private DoctorResponse(boolean success, String message, DoctorDto doctor, List<DoctorDto> doctors, Map<String, Object> user) {
        this.success = success;
        this.message = message;
        this.doctor = doctor;
        this.doctors = doctors;
        this.user = user;
    }

    public static DoctorResponse successWithDoctors(List<DoctorDto> doctors) {
        return new DoctorResponse(true, null, null, doctors, null);
    }

    public static DoctorResponse successWithDoctor(DoctorDto doctor) {
        return new DoctorResponse(true, null, doctor, null, null);
    }

    public static DoctorResponse successWithMessage(String message) {
        return new DoctorResponse(true, message, null, null, null);
    }

    public static DoctorResponse successWithUser(String message, Map<String, Object> user) {
        return new DoctorResponse(true, message, null, null, user);
    }

    public static DoctorResponse fail(String message) {
        return new DoctorResponse(false, message, null, null, null);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public DoctorDto getDoctor() {
        return doctor;
    }

    public List<DoctorDto> getDoctors() {
        return doctors;
    }

    public Map<String, Object> getUser() {
        return user;
    }
}
