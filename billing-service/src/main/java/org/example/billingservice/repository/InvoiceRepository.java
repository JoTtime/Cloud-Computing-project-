package org.example.billingservice.repository;


import com.billing.model.Invoice;
import com.billing.model.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Page<Invoice> findByCustomerId(String customerId, Pageable pageable);

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    Page<Invoice> findByCustomerIdAndStatus(String customerId, InvoiceStatus status, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE i.dueDate < :today AND i.status NOT IN ('PAID', 'CANCELLED', 'VOID')")
    List<Invoice> findOverdueInvoices(@Param("today") LocalDate today);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = :status")
    long countByStatus(@Param("status") InvoiceStatus status);

    boolean existsByInvoiceNumber(String invoiceNumber);
}