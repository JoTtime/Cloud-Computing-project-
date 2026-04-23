package com.medconnect.billingservice.security;

public class AuthenticatedUser {
    private final String userId;
    private final String email;
    private final String userType;

    public AuthenticatedUser(String userId, String email, String userType) {
        this.userId = userId;
        this.email = email;
        this.userType = userType;
    }

    public String getUserId()   { return userId; }
    public String getEmail()    { return email; }
    public String getUserType() { return userType; }
}
