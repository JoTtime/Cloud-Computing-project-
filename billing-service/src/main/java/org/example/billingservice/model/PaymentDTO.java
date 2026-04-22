package org.example.billingservice.model;

import org.example.billingservice.model.PaymentMethod;
import org.example.billingservice.model.PaymentStatus;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PaymentDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        private BigDecimal amount;

        @NotBlank(message = "Currency is required")
        private String currency;

        @NotNull(message = "Payment method is required")
        private PaymentMethod paymentMethod;

        private LocalDate paymentDate;
        private String transactionId;
        private String notes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String paymentReference;
        private Long invoiceId;
        private String invoiceNumber;
        private BigDecimal amount;
        private String currency;
        private PaymentMethod paymentMethod;
        private PaymentStatus status;
        private LocalDate paymentDate;
        private String transactionId;
        private String notes;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}