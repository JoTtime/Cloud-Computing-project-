package com.example.usermicroservice.repository;

import com.example.usermicroservice.Entity.ConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<ConnectionEntity, String> {
    List<ConnectionEntity> findByPatientIdAndStatusNotOrderByUpdatedAtDesc(String patientId, String status);
    List<ConnectionEntity> findByDoctorIdAndStatusNotOrderByUpdatedAtDesc(String doctorId, String status);
    Optional<ConnectionEntity> findByPatientIdAndDoctorIdAndStatusNot(String patientId, String doctorId, String status);
}
