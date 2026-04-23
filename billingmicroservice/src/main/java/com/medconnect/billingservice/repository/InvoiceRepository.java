package com.medconnect.billingservice.repository;

import com.medconnect.billingservice.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    List<Invoice> findByPatientId(String patientId);
    List<Invoice> findByDoctorId(String doctorId);
    List<Invoice> findByPatientIdAndStatus(String patientId, Invoice.InvoiceStatus status);
    List<Invoice> findByDoctorIdAndStatus(String doctorId, Invoice.InvoiceStatus status);
    Optional<Invoice> findByAppointmentId(String appointmentId);

    @Query("SELECT SUM(i.totalAmount) FROM Invoice i WHERE i.doctorId = :doctorId AND i.status = 'paid'")
    Double sumPaidByDoctorId(@Param("doctorId") String doctorId);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.doctorId = :doctorId AND i.status = 'unpaid'")
    Long countUnpaidByDoctorId(@Param("doctorId") String doctorId);
}
