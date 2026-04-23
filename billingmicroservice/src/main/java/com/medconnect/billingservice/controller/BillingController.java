package com.medconnect.billingservice.controller;

import com.medconnect.billingservice.dto.CreateInvoiceRequest;
import com.medconnect.billingservice.dto.PayInvoiceRequest;
import com.medconnect.billingservice.entity.Invoice;
import com.medconnect.billingservice.entity.PricingRule;
import com.medconnect.billingservice.security.AuthenticatedUser;
import com.medconnect.billingservice.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /** POST /billing — create invoice for a completed appointment */
    @PostMapping("/invoices")
    public ResponseEntity<Map<String, Object>> createInvoice(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CreateInvoiceRequest req) {
        Invoice inv = billingService.createInvoice(user, req);
        return ResponseEntity.ok(Map.of("success", true, "invoice", inv));
    }

    /** GET /billing — view all invoices (patient or doctor) */
    @GetMapping("/invoices")
    public ResponseEntity<Map<String, Object>> getMyInvoices(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) String status) {
        List<Invoice> invoices = billingService.getMyInvoices(user, status);
        return ResponseEntity.ok(Map.of("success", true, "invoices", invoices));
    }

    /** GET /billing?patient=... handled via /invoices with JWT */
    @GetMapping("/invoices/{id}")
    public ResponseEntity<Map<String, Object>> getInvoiceById(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id) {
        Invoice inv = billingService.getInvoiceById(user, id);
        return ResponseEntity.ok(Map.of("success", true, "invoice", inv));
    }

    /** PUT /billing/pay — mark invoice as paid */
    @PatchMapping("/invoices/{id}/pay")
    public ResponseEntity<Map<String, Object>> payInvoice(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id,
            @Valid @RequestBody PayInvoiceRequest req) {
        Invoice inv = billingService.payInvoice(user, id, req);
        return ResponseEntity.ok(Map.of("success", true, "invoice", inv));
    }

    /** Doctor cancels an invoice */
    @PatchMapping("/invoices/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelInvoice(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable String id) {
        Invoice inv = billingService.cancelInvoice(user, id);
        return ResponseEntity.ok(Map.of("success", true, "invoice", inv));
    }

    /** GET /billing/rules — view pricing rules */
    @GetMapping("/rules")
    public ResponseEntity<Map<String, Object>> getPricingRules() {
        List<PricingRule> rules = billingService.getPricingRules();
        return ResponseEntity.ok(Map.of("success", true, "rules", rules));
    }

    /** Doctor billing stats */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, Object> stats = billingService.getDoctorStats(user);
        return ResponseEntity.ok(Map.of("success", true, "stats", stats));
    }
}
