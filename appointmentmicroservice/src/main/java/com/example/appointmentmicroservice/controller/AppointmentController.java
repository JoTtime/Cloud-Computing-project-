package com.example.appointmentmicroservice.controller;

import com.example.appointmentmicroservice.dto.AppointmentActionRequest;
import com.example.appointmentmicroservice.dto.AppointmentResponse;
import com.example.appointmentmicroservice.dto.BookAppointmentRequest;
import com.example.appointmentmicroservice.dto.CancelAppointmentRequest;
import com.example.appointmentmicroservice.security.AuthenticatedUser;
import com.example.appointmentmicroservice.security.JwtService;
import com.example.appointmentmicroservice.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final JwtService jwtService;

    public AppointmentController(AppointmentService appointmentService, JwtService jwtService) {
        this.appointmentService = appointmentService;
        this.jwtService = jwtService;
    }

    @GetMapping("/doctor/{doctorId}/availability")
    public ResponseEntity<AppointmentResponse> getDoctorAvailability(
            @PathVariable String doctorId,
            @RequestParam String date,
            @RequestHeader("Authorization") String authorization
    ) {
        jwtService.authenticate(authorization);
        return ResponseEntity.ok(AppointmentResponse.successWithAvailability(
                appointmentService.getDoctorAvailability(doctorId, date)
        ));
    }

    @PostMapping("/book")
    public ResponseEntity<AppointmentResponse> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                AppointmentResponse.successWithAppointment(
                        "Appointment request created successfully",
                        appointmentService.bookAppointment(user, request)
                )
        );
    }

    @GetMapping("/patient")
    public ResponseEntity<AppointmentResponse> getPatientAppointments(
            @RequestParam(required = false) String status,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                AppointmentResponse.successWithAppointments(appointmentService.getPatientAppointments(user, status))
        );
    }

    @GetMapping("/doctor")
    public ResponseEntity<AppointmentResponse> getDoctorAppointments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                AppointmentResponse.successWithAppointments(appointmentService.getDoctorAppointments(user, status, date))
        );
    }

    @PatchMapping("/{appointmentId}/respond")
    public ResponseEntity<AppointmentResponse> respondToAppointment(
            @PathVariable String appointmentId,
            @Valid @RequestBody AppointmentActionRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(
                AppointmentResponse.successWithAppointment(
                        "Appointment updated",
                        appointmentService.respondToAppointment(user, appointmentId, request)
                )
        );
    }

    @PatchMapping("/{appointmentId}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @PathVariable String appointmentId,
            @RequestBody(required = false) CancelAppointmentRequest request,
            @RequestHeader("Authorization") String authorization
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        String reason = request == null ? null : request.getReason();
        return ResponseEntity.ok(
                AppointmentResponse.successWithAppointment(
                        "Appointment cancelled",
                        appointmentService.cancelAppointment(user, appointmentId, reason)
                )
        );
    }
}
