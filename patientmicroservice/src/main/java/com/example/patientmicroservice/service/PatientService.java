package com.example.patientmicroservice.service;

import com.example.patientmicroservice.dto.PatientDto;
import com.example.patientmicroservice.dto.PatientProfileUpdateRequest;
import com.example.patientmicroservice.model.PatientEntity;
import com.example.patientmicroservice.repository.PatientRepository;
import com.example.patientmicroservice.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public PatientDto getMyProfile(AuthenticatedUser user) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can view patient profile");
        }
        return PatientDto.fromEntity(getOrCreatePatient(user.userId()));
    }

    public PatientDto updateMyProfile(AuthenticatedUser user, PatientProfileUpdateRequest request) {
        if (!user.isPatient()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can update patient profile");
        }
        PatientEntity patient = getOrCreatePatient(user.userId());

        if (request.getFirstName() != null) patient.setFirstName(request.getFirstName());
        if (request.getLastName() != null) patient.setLastName(request.getLastName());
        if (request.getEmail() != null) patient.setEmail(request.getEmail());
        if (request.getPhone() != null) patient.setPhone(request.getPhone());
        if (request.getAddress() != null) patient.setAddress(request.getAddress());
        if (request.getDateOfBirth() != null) patient.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) patient.setGender(request.getGender());
        if (request.getBloodType() != null) patient.setBloodType(request.getBloodType());

        if (request.getAllergies() != null) patient.setAllergiesJson(toJson(request.getAllergies()));
        if (request.getEmergencyContact() != null) patient.setEmergencyContactJson(toJson(request.getEmergencyContact()));
        if (request.getMedicalHistory() != null) patient.setMedicalHistoryJson(toJson(request.getMedicalHistory()));
        if (request.getCurrentMedications() != null) patient.setCurrentMedicationsJson(toJson(request.getCurrentMedications()));

        return PatientDto.fromEntity(patientRepository.save(patient));
    }

    public PatientDto getPatientById(AuthenticatedUser user, String patientId) {
        if (!user.isDoctor() && !user.userId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to view this patient");
        }
        PatientEntity patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));
        return PatientDto.fromEntity(patient);
    }

    private PatientEntity getOrCreatePatient(String patientId) {
        return patientRepository.findById(patientId).orElseGet(() -> {
            PatientEntity patient = new PatientEntity();
            patient.setId(patientId);
            patient.setFirstName("Patient");
            patient.setLastName("User");
            patient.setEmail("patient+" + patientId + "@medconnect.local");
            return patientRepository.save(patient);
        });
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid profile payload format");
        }
    }
}
