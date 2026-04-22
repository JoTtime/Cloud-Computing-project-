package com.example.patientmicroservice.dto;

public class PatientResponse {
    private final boolean success;
    private final String message;
    private final PatientDto patient;

    private PatientResponse(boolean success, String message, PatientDto patient) {
        this.success = success;
        this.message = message;
        this.patient = patient;
    }

    public static PatientResponse successWithPatient(PatientDto patient) {
        return new PatientResponse(true, null, patient);
    }

    public static PatientResponse successWithMessage(String message) {
        return new PatientResponse(true, message, null);
    }

    public static PatientResponse fail(String message) {
        return new PatientResponse(false, message, null);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public PatientDto getPatient() {
        return patient;
    }
}
