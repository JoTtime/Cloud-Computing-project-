package com.example.appointmentmicroservice.dto;

import java.util.List;

public class AppointmentResponse {
    private final boolean success;
    private final String message;
    private final AppointmentDto appointment;
    private final List<AppointmentDto> appointments;
    private final AvailabilityDto availability;

    private AppointmentResponse(
            boolean success,
            String message,
            AppointmentDto appointment,
            List<AppointmentDto> appointments,
            AvailabilityDto availability
    ) {
        this.success = success;
        this.message = message;
        this.appointment = appointment;
        this.appointments = appointments;
        this.availability = availability;
    }

    public static AppointmentResponse success(String message) {
        return new AppointmentResponse(true, message, null, null, null);
    }

    public static AppointmentResponse successWithAppointment(String message, AppointmentDto appointment) {
        return new AppointmentResponse(true, message, appointment, null, null);
    }

    public static AppointmentResponse successWithAppointments(List<AppointmentDto> appointments) {
        return new AppointmentResponse(true, null, null, appointments, null);
    }

    public static AppointmentResponse successWithAvailability(AvailabilityDto availability) {
        return new AppointmentResponse(true, null, null, null, availability);
    }

    public static AppointmentResponse fail(String message) {
        return new AppointmentResponse(false, message, null, null, null);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public AppointmentDto getAppointment() {
        return appointment;
    }

    public List<AppointmentDto> getAppointments() {
        return appointments;
    }

    public AvailabilityDto getAvailability() {
        return availability;
    }
}
