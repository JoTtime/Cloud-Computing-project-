package org.example.patientmicroservice.service;

import org.example.patientmicroservice.dto.request.LoginRequest;
import org.example.patientmicroservice.dto.request.RegisterRequest;
import org.example.patientmicroservice.dto.request.UpdateProfileRequest;
import org.example.patientmicroservice.dto.response.AuthResponse;
import org.example.patientmicroservice.dto.response.MedicalHistoryResponse;
import org.example.patientmicroservice.dto.response.PatientResponse;
import org.example.patientmicroservice.exception.EmailAlreadyExistsException;
import org.example.patientmicroservice.exception.PatientNotFoundException;
import org.example.patientmicroservice.model.Patient;
import org.example.patientmicroservice.repository.PatientRepository;
import org.example.patientmicroservice.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    // ── Register ───────────────────────────────────────────────────────────────

    @Transactional
    public PatientResponse register(RegisterRequest request) {
        if (patientRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        Patient patient = Patient.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .address(request.getAddress())
                .status(Patient.AccountStatus.ACTIVE)
                .build();

        Patient saved = patientRepository.save(patient);
        log.info("New patient registered: {}", saved.getEmail());
        return PatientResponse.from(saved);
    }

    // ── Login ──────────────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        // This will throw BadCredentialsException if credentials are wrong
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(request.getEmail());

        Patient patient = patientRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new PatientNotFoundException("Patient not found"));

        return new AuthResponse(token, PatientResponse.from(patient));
    }

    // ── Get Profile ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PatientResponse getProfile(String email) {
        Patient patient = findActiveByEmail(email);
        return PatientResponse.from(patient);
    }

    // ── Update Profile ─────────────────────────────────────────────────────────

    @Transactional
    public PatientResponse updateProfile(String email, UpdateProfileRequest request) {
        Patient patient = findActiveByEmail(email);

        if (request.getFirstName() != null)   patient.setFirstName(request.getFirstName());
        if (request.getLastName() != null)    patient.setLastName(request.getLastName());
        if (request.getDateOfBirth() != null) patient.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null)      patient.setGender(request.getGender());
        if (request.getPhone() != null)       patient.setPhone(request.getPhone());
        if (request.getAddress() != null)     patient.setAddress(request.getAddress());
        if (request.getNotes() != null)       patient.setNotes(request.getNotes());

        return PatientResponse.from(patientRepository.save(patient));
    }

    // ── Medical History ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MedicalHistoryResponse getMedicalHistory(String email) {
        Patient patient = findActiveByEmail(email);
        return MedicalHistoryResponse.from(patient);
    }

    // ── Deactivate ─────────────────────────────────────────────────────────────

    @Transactional
    public void deactivateAccount(String email) {
        Patient patient = findActiveByEmail(email);
        patient.setStatus(Patient.AccountStatus.INACTIVE);
        patientRepository.save(patient);
        log.info("Patient account deactivated: {}", email);
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private Patient findActiveByEmail(String email) {
        Patient patient = patientRepository.findByEmail(email)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found"));

        if (patient.getStatus() == Patient.AccountStatus.INACTIVE) {
            throw new PatientNotFoundException("Patient account is deactivated");
        }
        return patient;
    }
}

