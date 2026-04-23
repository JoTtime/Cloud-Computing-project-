package com.medconnect.billingservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CampayInitiateRequest {

    @NotBlank
    private String phoneNumber;

    private String operator;

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
    }
}
