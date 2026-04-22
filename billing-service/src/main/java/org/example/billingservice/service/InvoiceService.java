package org.example.billingservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.billingservice.dto.InvoiceDTO;
import org.example.billingservice.dto.InvoiceItemDTO;
import org.example.billingservice.dto.PaymentDTO;
import org.example.billingservice.exception.BadRequestException;
import org.example.billingservice.exception.ResourceNotFoundException;
import org.example.billingservice.model.*;
import org.example.billingservice.repository.InvoiceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    @Transactional
    public InvoiceDTO.Response createInvoice(InvoiceDTO.CreateRequest request) {
        String invoiceNumber = generateInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .customerId(request.getCustomerId())
                .customerName(request.getCustomerName())
                .customerEmail(request.getCustomerEmail())
                .currency(request.getCurrency())
                .issueDate(request.getIssueDate() != null ? request.getIssueDate() : LocalDate.now())
                .dueDate(request.getDueDate())
                .notes(request.getNotes())
                .taxAmount(request.getTaxAmount() != null ? request.getTaxAmount() : BigDecimal.ZERO)
                .status(InvoiceStatus.DRAFT)
                .subtotal(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .amountPaid(BigDecimal.ZERO)
                .amountDue(BigDecimal.ZERO)
                .build();

        List<InvoiceItem> items = request.getItems().stream()
                .map(itemReq -> buildInvoiceItem(itemReq, invoice))
                .collect(Collectors.toList());

        invoice.setItems(items);
        invoice.recalculateTotals();

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Created invoice: {}", invoiceNumber);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public InvoiceDTO.Response getInvoiceById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public InvoiceDTO.Response getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceNumber));
        return toResponse(invoice);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceDTO.Summary> getAllInvoices(Pageable pageable) {
        return invoiceRepository.findAll(pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceDTO.Summary> getInvoicesByCustomer(String customerId, Pageable pageable) {
        return invoiceRepository.findByCustomerId(customerId, pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceDTO.Summary> getInvoicesByStatus(InvoiceStatus status, Pageable pageable) {
        return invoiceRepository.findByStatus(status, pageable).map(this::toSummary);
    }

    @Transactional
    public InvoiceDTO.Response updateInvoice(Long id, InvoiceDTO.UpdateRequest request) {
        Invoice invoice = findById(id);

        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.VOID) {
            throw new BadRequestException("Cannot update a " + invoice.getStatus() + " invoice");
        }

        if (request.getCustomerEmail() != null) invoice.setCustomerEmail(request.getCustomerEmail());
        if (request.getDueDate() != null) invoice.setDueDate(request.getDueDate());
        if (request.getNotes() != null) invoice.setNotes(request.getNotes());
        if (request.getTaxAmount() != null) {
            invoice.setTaxAmount(request.getTaxAmount());
            invoice.recalculateTotals();
        }

        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceDTO.Response sendInvoice(Long id) {
        Invoice invoice = findById(id);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT invoices can be sent");
        }
        invoice.setStatus(InvoiceStatus.SENT);
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceDTO.Response cancelInvoice(Long id) {
        Invoice invoice = findById(id);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Cannot cancel a PAID invoice");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceDTO.Response voidInvoice(Long id) {
        Invoice invoice = findById(id);
        invoice.setStatus(InvoiceStatus.VOID);
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public void markOverdueInvoices() {
        List<Invoice> overdue = invoiceRepository.findOverdueInvoices(LocalDate.now());
        overdue.forEach(inv -> inv.setStatus(InvoiceStatus.OVERDUE));
        invoiceRepository.saveAll(overdue);
        log.info("Marked {} invoices as overdue", overdue.size());
    }

    // --- Helpers ---

    public Invoice findById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
    }

    private String generateInvoiceNumber() {
        String prefix = "INV-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return prefix + suffix;
    }

    private InvoiceItem buildInvoiceItem(InvoiceItemDTO.CreateRequest req, Invoice invoice) {
        InvoiceItem item = InvoiceItem.builder()
                .invoice(invoice)
                .description(req.getDescription())
                .productCode(req.getProductCode())
                .quantity(req.getQuantity())
                .unitPrice(req.getUnitPrice())
                .discountPercent(req.getDiscountPercent() != null ? req.getDiscountPercent() : BigDecimal.ZERO)
                .lineTotal(BigDecimal.ZERO)
                .build();
        item.calculateLineTotal();
        return item;
    }

    public InvoiceDTO.Response toResponse(Invoice invoice) {
        List<InvoiceItemDTO.Response> itemResponses = invoice.getItems().stream()
                .map(i -> InvoiceItemDTO.Response.builder()
                        .id(i.getId())
                        .description(i.getDescription())
                        .productCode(i.getProductCode())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .discountPercent(i.getDiscountPercent())
                        .lineTotal(i.getLineTotal())
                        .build())
                .collect(Collectors.toList());

        List<PaymentDTO.Response> paymentResponses = invoice.getPayments().stream()
                .map(p -> PaymentDTO.Response.builder()
                        .id(p.getId())
                        .paymentReference(p.getPaymentReference())
                        .invoiceId(invoice.getId())
                        .invoiceNumber(invoice.getInvoiceNumber())
                        .amount(p.getAmount())
                        .currency(p.getCurrency())
                        .paymentMethod(p.getPaymentMethod())
                        .status(p.getStatus())
                        .paymentDate(p.getPaymentDate())
                        .transactionId(p.getTransactionId())
                        .notes(p.getNotes())
                        .createdAt(p.getCreatedAt())
                        .updatedAt(p.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return InvoiceDTO.Response.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .customerId(invoice.getCustomerId())
                .customerName(invoice.getCustomerName())
                .customerEmail(invoice.getCustomerEmail())
                .status(invoice.getStatus())
                .subtotal(invoice.getSubtotal())
                .taxAmount(invoice.getTaxAmount())
                .totalAmount(invoice.getTotalAmount())
                .amountPaid(invoice.getAmountPaid())
                .amountDue(invoice.getAmountDue())
                .currency(invoice.getCurrency())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .notes(invoice.getNotes())
                .items(itemResponses)
                .payments(paymentResponses)
                .createdAt(invoice.getCreatedAt())
                .updatedAt(invoice.getUpdatedAt())
                .build();
    }

    private InvoiceDTO.Summary toSummary(Invoice invoice) {
        return InvoiceDTO.Summary.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .customerId(invoice.getCustomerId())
                .customerName(invoice.getCustomerName())
                .status(invoice.getStatus())
                .totalAmount(invoice.getTotalAmount())
                .amountDue(invoice.getAmountDue())
                .currency(invoice.getCurrency())
                .dueDate(invoice.getDueDate())
                .createdAt(invoice.getCreatedAt())
                .build();
    }
}