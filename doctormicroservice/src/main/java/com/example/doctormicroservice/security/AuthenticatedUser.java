package com.example.doctormicroservice.security;

public record AuthenticatedUser(String userId, String userType) {
    public boolean isDoctor() {
        return "doctor".equalsIgnoreCase(userType);
    }
}
