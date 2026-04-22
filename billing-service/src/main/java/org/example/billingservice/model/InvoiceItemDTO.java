package org.example.billingservice.model;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

public class InvoiceItemDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRequest {
        @NotBlank(message = "Description is required")
        private String description;

        private String productCode;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
        private BigDecimal unitPrice;

        @DecimalMin(value = "0.0")
        @DecimalMax(value = "100.0")
        @Builder.Default
        private BigDecimal discountPercent = BigDecimal.ZERO;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String description;
        private String productCode;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal discountPercent;
        private BigDecimal lineTotal;
    }
}