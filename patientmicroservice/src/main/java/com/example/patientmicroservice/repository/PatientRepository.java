package com.example.patientmicroservice.repository;

import com.example.patientmicroservice.model.PatientEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientRepository extends JpaRepository<PatientEntity, String> {
    Optional<PatientEntity> findByEmail(String email);
}
