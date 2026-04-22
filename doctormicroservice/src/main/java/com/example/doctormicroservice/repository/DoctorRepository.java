package com.example.doctormicroservice.repository;

import com.example.doctormicroservice.model.DoctorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<DoctorEntity, String> {
    Optional<DoctorEntity> findByEmail(String email);

    List<DoctorEntity> findBySpecialtyContainingIgnoreCaseAndFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String specialty,
            String firstName,
            String lastName
    );

    List<DoctorEntity> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);

    List<DoctorEntity> findBySpecialtyContainingIgnoreCase(String specialty);
}
