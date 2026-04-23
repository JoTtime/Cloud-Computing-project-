package com.medconnect.billingservice.dto;

import jakarta.validation.constraints.NotBlank;

public class PayInvoiceRequest {

    @NotBlank
    private String paymentMethod;

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String v) { this.paymentMethod = v; }
}
