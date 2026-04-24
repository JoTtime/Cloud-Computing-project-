package com.example.doctormicroservice.controller;

import com.example.doctormicroservice.dto.DoctorProfileUpdateRequest;
import com.example.doctormicroservice.dto.DoctorResponse;
import com.example.doctormicroservice.security.AuthenticatedUser;
import com.example.doctormicroservice.security.JwtService;
import com.example.doctormicroservice.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;
    private final JwtService jwtService;

    public DoctorController(DoctorService doctorService, JwtService jwtService) {
        this.doctorService = doctorService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<DoctorResponse> getDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String search,
            @RequestHeader("Authorization") String authorization
    ) {
        jwtService.authenticate(authorization);
        return ResponseEntity.ok(DoctorResponse.successWithDoctors(doctorService.getDoctors(specialty, search)));
    }

    @GetMapping("/specialties")
    public ResponseEntity<DoctorResponse> getSpecialties(
            @RequestHeader("Authorization") String authorization
    ) {
        jwtService.authenticate(authorization);
        return ResponseEntity.ok(DoctorResponse.successWithSpecialties(doctorService.getSpecialties()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getDoctorById(
            @PathVariable String id,
            @RequestHeader("Authorization") String authorization
    ) {
        jwtService.authenticate(authorization);
        return ResponseEntity.ok(DoctorResponse.successWithDoctor(doctorService.getDoctorById(id)));
    }

    @GetMapping("/me")
    public ResponseEntity<DoctorResponse> getCurrentDoctor(
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(DoctorResponse.successWithDoctor(doctorService.getCurrentDoctor(user)));
    }

    @PatchMapping("/profile")
    public ResponseEntity<DoctorResponse> updateProfile(
            @RequestBody DoctorProfileUpdateRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        doctorService.updateProfile(user, request);
        return ResponseEntity.ok(DoctorResponse.successWithMessage("Doctor profile updated"));
    }

    @PatchMapping("/complete-onboarding")
    public ResponseEntity<DoctorResponse> completeOnboarding(
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(DoctorResponse.successWithUser(
                "Doctor onboarding completed",
                doctorService.completeOnboarding(user)
        ));
    }
}
