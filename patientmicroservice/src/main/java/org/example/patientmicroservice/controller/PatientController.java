package org.example.patientmicroservice.controller;

import org.example.patientmicroservice.dto.request.LoginRequest;
import org.example.patientmicroservice.dto.request.RegisterRequest;
import org.example.patientmicroservice.dto.request.UpdateProfileRequest;
import org.example.patientmicroservice.dto.response.ApiResponse;
import org.example.patientmicroservice.dto.response.AuthResponse;
import org.example.patientmicroservice.dto.response.MedicalHistoryResponse;
import org.example.patientmicroservice.dto.response.PatientResponse;
import org.example.patientmicroservice.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    /**
     * POST /patients/register
     * Create a new patient account.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<PatientResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        PatientResponse patient = patientService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Patient registered successfully", patient));
    }

    /**
     * POST /patients/login
     * Authenticate and receive a JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse auth = patientService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", auth));
    }

    /**
     * GET /patients
     * View the authenticated patient's profile.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PatientResponse>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {

        PatientResponse profile = patientService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Profile fetched successfully", profile));
    }

    /**
     * PUT /patients
     * Update the authenticated patient's profile.
     */
    @PutMapping
    public ResponseEntity<ApiResponse<PatientResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request) {

        PatientResponse updated = patientService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", updated));
    }

    /**
     * GET /patients/history
     * View the authenticated patient's full medical history.
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<MedicalHistoryResponse>> getMedicalHistory(
            @AuthenticationPrincipal UserDetails userDetails) {

        MedicalHistoryResponse history = patientService.getMedicalHistory(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Medical history fetched successfully", history));
    }

    /**
     * DELETE /patients
     * Deactivate (soft-delete) the authenticated patient's account.
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deactivateAccount(
            @AuthenticationPrincipal UserDetails userDetails) {

        patientService.deactivateAccount(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Account deactivated successfully"));
    }
}

