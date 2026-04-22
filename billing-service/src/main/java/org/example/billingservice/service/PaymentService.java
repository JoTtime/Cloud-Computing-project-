package org.example.billingservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.billingservice.dto.PaymentDTO;
import org.example.billingservice.exception.BadRequestException;
import org.example.billingservice.exception.ResourceNotFoundException;
import org.example.billingservice.model.*;
import org.example.billingservice.repository.PaymentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceService invoiceService;

    @Transactional
    public PaymentDTO.Response recordPayment(Long invoiceId, PaymentDTO.CreateRequest request) {
        Invoice invoice = invoiceService.findById(invoiceId);

        if (invoice.getStatus() == InvoiceStatus.CANCELLED || invoice.getStatus() == InvoiceStatus.VOID) {
            throw new BadRequestException("Cannot record payment for a " + invoice.getStatus() + " invoice");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Invoice is already fully paid");
        }

        BigDecimal amountDue = invoice.getAmountDue();
        if (request.getAmount().compareTo(amountDue) > 0) {
            throw new BadRequestException(
                    "Payment amount (" + request.getAmount() + ") exceeds amount due (" + amountDue + ")");
        }

        Payment payment = Payment.builder()
                .paymentReference(generatePaymentReference())
                .invoice(invoice)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.COMPLETED)
                .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now())
                .transactionId(request.getTransactionId())
                .notes(request.getNotes())
                .build();

        paymentRepository.save(payment);

        // Update invoice financials
        BigDecimal newAmountPaid = invoice.getAmountPaid().add(request.getAmount());
        invoice.setAmountPaid(newAmountPaid);
        invoice.setAmountDue(invoice.getTotalAmount().subtract(newAmountPaid));

        if (invoice.getAmountDue().compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        log.info("Recorded payment {} for invoice {}", payment.getPaymentReference(), invoice.getInvoiceNumber());
        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDTO.Response> getPaymentsByInvoice(Long invoiceId) {
        invoiceService.findById(invoiceId);
        return paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentDTO.Response getPaymentById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public PaymentDTO.Response getPaymentByReference(String ref) {
        Payment payment = paymentRepository.findByPaymentReference(ref)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + ref));
        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDTO.Response> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public PaymentDTO.Response refundPayment(Long id) {
        Payment payment = findById(id);

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new BadRequestException("Only COMPLETED payments can be refunded");
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);

        Invoice invoice = payment.getInvoice();
        BigDecimal newAmountPaid = invoice.getAmountPaid().subtract(payment.getAmount());
        invoice.setAmountPaid(newAmountPaid.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newAmountPaid);
        invoice.setAmountDue(invoice.getTotalAmount().subtract(invoice.getAmountPaid()));

        if (invoice.getAmountPaid().compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(InvoiceStatus.SENT);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        log.info("Refunded payment: {}", payment.getPaymentReference());
        return toResponse(payment);
    }

    // --- Helpers ---

    private Payment findById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
    }

    private String generatePaymentReference() {
        return "PAY-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
    }

    private PaymentDTO.Response toResponse(Payment payment) {
        Invoice invoice = payment.getInvoice();
        return PaymentDTO.Response.builder()
                .id(payment.getId())
                .paymentReference(payment.getPaymentReference())
                .invoiceId(invoice != null ? invoice.getId() : null)
                .invoiceNumber(invoice != null ? invoice.getInvoiceNumber() : null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .paymentDate(payment.getPaymentDate())
                .transactionId(payment.getTransactionId())
                .notes(payment.getNotes())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}