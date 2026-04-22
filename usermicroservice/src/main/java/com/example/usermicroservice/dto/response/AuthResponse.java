package com.example.usermicroservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private boolean success;
    private String message;
    private AuthPayload data;

    public static AuthResponse ok(String message, AuthPayload data) {
        AuthResponse r = new AuthResponse();
        r.setSuccess(true);
        r.setMessage(message);
        r.setData(data);
        return r;
    }

    public static AuthResponse fail(String message) {
        AuthResponse r = new AuthResponse();
        r.setSuccess(false);
        r.setMessage(message);
        return r;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public AuthPayload getData() {
        return data;
    }

    public void setData(AuthPayload data) {
        this.data = data;
    }
}
