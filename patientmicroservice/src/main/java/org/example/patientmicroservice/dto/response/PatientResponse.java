package org.example.patientmicroservice.dto.response;

import org.example.patientmicroservice.model.Allergy;
import org.example.patientmicroservice.model.MedicalCondition;
import org.example.patientmicroservice.model.Patient;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Full profile returned after login / GET /patients */
@Data
@Builder
public class PatientResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private Patient.Gender gender;
    private String email;
    private String phone;
    private String address;
    private Patient.AccountStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Converts a Patient entity to a response DTO (no password exposed). */
    public static PatientResponse from(Patient patient) {
        return PatientResponse.builder()
                .id(patient.getId())
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender())
                .email(patient.getEmail())
                .phone(patient.getPhone())
                .address(patient.getAddress())
                .status(patient.getStatus())
                .createdAt(patient.getCreatedAt())
                .updatedAt(patient.getUpdatedAt())
                .build();
    }
}

