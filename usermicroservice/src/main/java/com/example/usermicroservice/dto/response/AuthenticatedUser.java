package com.example.usermicroservice.dto.response;

public class AuthenticatedUser {
    private final String userId;
    private final String userType;

    public AuthenticatedUser(String userId, String userType) {
        this.userId = userId;
        this.userType = userType;
    }

    public String userId() {
        return userId;
    }

    public String userType() {
        return userType;
    }

    public boolean isPatient() {
        return "patient".equalsIgnoreCase(userType);
    }

    public boolean isDoctor() {
        return "doctor".equalsIgnoreCase(userType);
    }

    public boolean isAdmin() {
        return "admin".equalsIgnoreCase(userType);
    }
}
