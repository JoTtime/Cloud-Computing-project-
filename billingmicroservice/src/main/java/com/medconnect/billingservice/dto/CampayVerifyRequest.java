package com.medconnect.billingservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CampayVerifyRequest {

    @NotBlank
    private String reference;

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }
}
