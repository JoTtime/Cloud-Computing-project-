package org.example.patientmicroservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String type = "Bearer";
    private PatientResponse patient;

    public AuthResponse(String token, PatientResponse patient) {
        this.token = token;
        this.patient = patient;
    }
}

