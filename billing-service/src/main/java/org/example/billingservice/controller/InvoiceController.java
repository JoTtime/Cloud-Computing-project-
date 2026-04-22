package org.example.billingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.billingservice.dto.InvoiceDTO;
import org.example.billingservice.model.InvoiceStatus;
import org.example.billingservice.service.InvoiceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    public ResponseEntity<InvoiceDTO.Response> createInvoice(@Valid @RequestBody InvoiceDTO.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDTO.Response> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<InvoiceDTO.Response> getInvoiceByNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(invoiceService.getInvoiceByNumber(invoiceNumber));
    }

    @GetMapping
    public ResponseEntity<Page<InvoiceDTO.Summary>> getAllInvoices(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) InvoiceStatus status) {

        if (customerId != null) {
            return ResponseEntity.ok(invoiceService.getInvoicesByCustomer(customerId, pageable));
        } else if (status != null) {
            return ResponseEntity.ok(invoiceService.getInvoicesByStatus(status, pageable));
        }
        return ResponseEntity.ok(invoiceService.getAllInvoices(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceDTO.Response> updateInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceDTO.UpdateRequest request) {
        return ResponseEntity.ok(invoiceService.updateInvoice(id, request));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<InvoiceDTO.Response> sendInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.sendInvoice(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<InvoiceDTO.Response> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.cancelInvoice(id));
    }

    @PostMapping("/{id}/void")
    public ResponseEntity<InvoiceDTO.Response> voidInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.voidInvoice(id));
    }
}
