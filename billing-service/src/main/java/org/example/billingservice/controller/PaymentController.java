package org.example.billingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.billingservice.dto.PaymentDTO;
import org.example.billingservice.service.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentDTO.Response> recordPayment(
            @PathVariable Long invoiceId,
            @Valid @RequestBody PaymentDTO.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.recordPayment(invoiceId, request));
    }

    @GetMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<List<PaymentDTO.Response>> getPaymentsByInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(paymentService.getPaymentsByInvoice(invoiceId));
    }

    @GetMapping("/payments")
    public ResponseEntity<Page<PaymentDTO.Response>> getAllPayments(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(paymentService.getAllPayments(pageable));
    }

    @GetMapping("/payments/{id}")
    public ResponseEntity<PaymentDTO.Response> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/payments/reference/{ref}")
    public ResponseEntity<PaymentDTO.Response> getPaymentByReference(@PathVariable String ref) {
        return ResponseEntity.ok(paymentService.getPaymentByReference(ref));
    }

    @PostMapping("/payments/{id}/refund")
    public ResponseEntity<PaymentDTO.Response> refundPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.refundPayment(id));
    }
}
