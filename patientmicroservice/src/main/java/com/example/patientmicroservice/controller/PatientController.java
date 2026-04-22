package com.example.patientmicroservice.controller;

import com.example.patientmicroservice.dto.PatientProfileUpdateRequest;
import com.example.patientmicroservice.dto.PatientResponse;
import com.example.patientmicroservice.security.AuthenticatedUser;
import com.example.patientmicroservice.security.JwtService;
import com.example.patientmicroservice.service.PatientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final JwtService jwtService;

    public PatientController(PatientService patientService, JwtService jwtService) {
        this.patientService = patientService;
        this.jwtService = jwtService;
    }

    @GetMapping("/profile")
    public ResponseEntity<PatientResponse> getMyProfile(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(PatientResponse.successWithPatient(patientService.getMyProfile(user)));
    }

    @PutMapping("/profile")
    public ResponseEntity<PatientResponse> updateMyProfile(
            @RequestBody PatientProfileUpdateRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(PatientResponse.successWithPatient(patientService.updateMyProfile(user, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getPatientById(
            @PathVariable String id,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(PatientResponse.successWithPatient(patientService.getPatientById(user, id)));
    }
}
