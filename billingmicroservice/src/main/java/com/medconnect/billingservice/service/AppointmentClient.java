package com.medconnect.billingservice.service;

public interface AppointmentClient {
    /** Returns appointment status lowercase e.g. "completed", "cancelled", or null if unreachable */
    String getAppointmentStatus(String appointmentId);
}
