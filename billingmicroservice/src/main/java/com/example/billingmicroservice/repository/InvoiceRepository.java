package com.example.billingmicroservice.repository;

import com.example.billingmicroservice.model.InvoiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, String> {
    Optional<InvoiceEntity> findByAppointmentId(String appointmentId);
    List<InvoiceEntity> findByDoctorIdOrderByIssuedAtDesc(String doctorId);
    List<InvoiceEntity> findByPatientIdOrderByIssuedAtDesc(String patientId);
}
