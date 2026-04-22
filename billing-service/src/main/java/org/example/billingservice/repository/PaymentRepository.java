package org.example.billingservice.repository;


import com.billing.model.Payment;
import com.billing.model.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentReference(String paymentReference);

    List<Payment> findByInvoiceId(Long invoiceId);

    Page<Payment> findByStatus(PaymentStatus status, Pageable pageable);

    boolean existsByPaymentReference(String paymentReference);
}
