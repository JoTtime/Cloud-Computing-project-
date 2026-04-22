package com.example.appointmentmicroservice.model;

public enum AppointmentType {
    in_person,
    video;

    public static AppointmentType fromApiValue(String apiValue) {
        if ("in-person".equalsIgnoreCase(apiValue)) {
            return in_person;
        }
        if ("video".equalsIgnoreCase(apiValue)) {
            return video;
        }
        throw new IllegalArgumentException("Unsupported appointment type: " + apiValue);
    }

    public String toApiValue() {
        return this == in_person ? "in-person" : "video";
    }
}
