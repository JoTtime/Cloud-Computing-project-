package org.example.patientmicroservice.security;

import org.example.patientmicroservice.model.Patient;
import org.example.patientmicroservice.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientUserDetailsService implements UserDetailsService {

    private final PatientRepository patientRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Patient patient = patientRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Patient not found with email: " + email));

        return new org.springframework.security.core.userdetails.User(
                patient.getEmail(),
                patient.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_PATIENT"))
        );
    }
}

