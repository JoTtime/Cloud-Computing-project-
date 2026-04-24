package com.example.billingmicroservice.controller;

import com.example.billingmicroservice.dto.BillingResponse;
import com.example.billingmicroservice.dto.GenerateInvoiceRequest;
import com.example.billingmicroservice.security.AuthenticatedUser;
import com.example.billingmicroservice.security.JwtService;
import com.example.billingmicroservice.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class BillingController {
    private final BillingService billingService;
    private final JwtService jwtService;

    public BillingController(BillingService billingService, JwtService jwtService) {
        this.billingService = billingService;
        this.jwtService = jwtService;
    }

    @PostMapping("/invoices/generate")
    public ResponseEntity<BillingResponse> generateInvoice(
            @Valid @RequestBody GenerateInvoiceRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                BillingResponse.successWithInvoice(
                        "Invoice generated",
                        billingService.generateInvoice(user, authorization, request.getAppointmentId())
                )
        );
    }

    @GetMapping("/invoices/my")
    public ResponseEntity<BillingResponse> myInvoices(
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(BillingResponse.successWithInvoices(billingService.getMyInvoices(user)));
    }

    @PostMapping("/invoices/{id}/pay")
    public ResponseEntity<BillingResponse> payInvoice(
            @PathVariable("id") String invoiceId,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                BillingResponse.successWithInvoice(
                        "Invoice paid successfully",
                        billingService.payInvoice(user, invoiceId)
                )
        );
    }
}
