package com.medconnect.billingservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class RestAppointmentClient implements AppointmentClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String appointmentServiceUrl;

    public RestAppointmentClient(
            @Value("${medconnect.appointment-service.url:http://localhost:8085}") String url) {
        this.appointmentServiceUrl = url;
    }

    @Override
    public String getAppointmentStatus(String appointmentId) {
        try {
            // GET /api/appointments/{id}/status — returns { "status": "confirmed" }
            String url = appointmentServiceUrl + "/api/appointments/" + appointmentId + "/status";
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp != null && resp.containsKey("status")) {
                return resp.get("status").toString().toLowerCase();
            }
        } catch (Exception ignored) {
            // If appointment service is unreachable, allow invoice creation to proceed
        }
        return null;
    }
}
