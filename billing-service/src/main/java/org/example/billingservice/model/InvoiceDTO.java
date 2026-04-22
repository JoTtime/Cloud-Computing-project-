package org.example.billingservice.model;

import org.example.billingservice.model.InvoiceItemDTO;
import org.example.billingservice.model.InvoiceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import org.example.billingservice.model.PaymentDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class InvoiceDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRequest {
        @NotBlank(message = "Customer ID is required")
        private String customerId;

        @NotBlank(message = "Customer name is required")
        private String customerName;

        private String customerEmail;

        @NotBlank(message = "Currency is required")
        private String currency;

        private LocalDate issueDate;
        private LocalDate dueDate;
        private String notes;

        @DecimalMin(value = "0.0", inclusive = true)
        @Builder.Default
        private BigDecimal taxAmount = BigDecimal.ZERO;

        @NotEmpty(message = "At least one item is required")
        @Valid
        private List<InvoiceItemDTO.CreateRequest> items;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateRequest {
        private String customerEmail;
        private LocalDate dueDate;
        private String notes;
        private BigDecimal taxAmount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String invoiceNumber;
        private String customerId;
        private String customerName;
        private String customerEmail;
        private InvoiceStatus status;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal totalAmount;
        private BigDecimal amountPaid;
        private BigDecimal amountDue;
        private String currency;
        private LocalDate issueDate;
        private LocalDate dueDate;
        private String notes;
        private List<InvoiceItemDTO.Response> items;
        private List<PaymentDTO.Response> payments;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Summary {
        private Long id;
        private String invoiceNumber;
        private String customerId;
        private String customerName;
        private InvoiceStatus status;
        private BigDecimal totalAmount;
        private BigDecimal amountDue;
        private String currency;
        private LocalDate dueDate;
        private LocalDateTime createdAt;
    }
}