package com.example.usermicroservice.dto.response;

public class AuthPayload {

    private UserResponse user;
    private String token;

    public AuthPayload() {
    }

    public AuthPayload(UserResponse user, String token) {
        this.user = user;
        this.token = token;
    }

    public UserResponse getUser() {
        return user;
    }

    public void setUser(UserResponse user) {
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
