package com.example.usermicroservice.integration.patient;

import com.example.usermicroservice.dto.request.SignupRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PatientServiceClient {

    private final RestTemplate restTemplate;
    private final String patientServiceBaseUrl;

    public PatientServiceClient(
            RestTemplate restTemplate,
            @Value("${patient.service.base-url:http://localhost:8081}") String patientServiceBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.patientServiceBaseUrl = patientServiceBaseUrl;
    }

    public void createPatientFromSignup(SignupRequest request) {
        PatientRegisterRequest payload = new PatientRegisterRequest();
        payload.setFirstName(request.getFirstName().trim());
        payload.setLastName(request.getLastName().trim());
        payload.setDateOfBirth(request.getDateOfBirth());
        payload.setGender(request.getGender());
        payload.setEmail(request.getEmail().trim().toLowerCase());
        payload.setPassword(request.getPassword());
        payload.setPhone(request.getPhone());
        payload.setAddress(request.getAddress());

        String url = patientServiceBaseUrl + "/patients/register";
        try {
            restTemplate.postForEntity(url, payload, String.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "User created locally but patient profile creation failed. Please retry."
            );
        }
    }
}
