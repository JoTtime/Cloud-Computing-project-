package com.medconnect.billingservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class CampayService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${campay.base-url:https://demo.campay.net/api}")
    private String baseUrl;

    @Value("${campay.username:}")
    private String username;

    @Value("${campay.password:}")
    private String password;

    @Value("${campay.currency:XAF}")
    private String currency;

    public Map<String, Object> initiatePayment(double amount,
                                               String phoneNumber,
                                               String operator,
                                               String description,
                                               String externalReference) {
        String token = getAccessToken();
        String cleanedPhone = phoneNumber.replaceAll("\\s+", "");

        Map<String, Object> body = new HashMap<>();
        body.put("amount", String.format("%.0f", amount));
        body.put("currency", currency);
        body.put("from", cleanedPhone);
        body.put("description", description);
        body.put("external_reference", externalReference);
        if (operator != null && !operator.isBlank()) {
            body.put("operator", operator);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Token " + token);

        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/collect/",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );
        Map<String, Object> data = response.getBody() != null ? response.getBody() : Map.of();
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to initiate Campay payment");
        }
        return data;
    }

    public Map<String, Object> verifyTransaction(String reference) {
        String token = getAccessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Token " + token);

        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/transaction/" + reference + "/",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        Map<String, Object> data = response.getBody() != null ? response.getBody() : Map.of();
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to verify Campay payment");
        }
        return data;
    }

    private String getAccessToken() {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Campay credentials are missing. Set campay.username and campay.password.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("username", username, "password", password);

        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/token/",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        Object token = response.getBody() != null ? response.getBody().get("token") : null;
        if (!response.getStatusCode().is2xxSuccessful() || token == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to authenticate with Campay");
        }
        return Objects.toString(token);
    }
}
