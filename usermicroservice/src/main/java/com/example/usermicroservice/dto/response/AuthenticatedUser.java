package com.example.usermicroservice.dto.response;

public record AuthenticatedUser(String userId, String userType) {
    public boolean isPatient() {
        return "patient".equalsIgnoreCase(userType);
    }

    public boolean isDoctor() {
        return "doctor".equalsIgnoreCase(userType);
    }
}
