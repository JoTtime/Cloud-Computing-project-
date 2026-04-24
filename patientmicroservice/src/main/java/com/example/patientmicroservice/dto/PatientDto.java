package com.example.patientmicroservice.dto;

import com.example.patientmicroservice.model.PatientEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

public record PatientDto(
        String _id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String dateOfBirth,
        String gender,
        String bloodType,
        List<Map<String, Object>> allergies,
        Map<String, Object> emergencyContact,
        List<Map<String, Object>> medicalHistory,
        List<Map<String, Object>> currentMedications,
        List<Map<String, Object>> vitals,
        String doctorNotes
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static PatientDto fromEntity(PatientEntity patient) {
        return new PatientDto(
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getEmail(),
                patient.getPhone() == null ? "" : patient.getPhone(),
                patient.getAddress() == null ? "" : patient.getAddress(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getBloodType(),
                parseList(patient.getAllergiesJson()),
                parseMap(patient.getEmergencyContactJson()),
                parseList(patient.getMedicalHistoryJson()),
                parseList(patient.getCurrentMedicationsJson()),
                parseList(patient.getVitalsJson()),
                patient.getDoctorNotes()
        );
    }

    private static List<Map<String, Object>> parseList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return MAPPER.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return MAPPER.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return Map.of();
        }
    }
}
