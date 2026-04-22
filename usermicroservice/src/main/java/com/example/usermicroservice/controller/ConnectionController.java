package com.example.usermicroservice.controller;

import com.example.usermicroservice.dto.response.AuthenticatedUser;
import com.example.usermicroservice.service.ConnectionService;
import com.example.usermicroservice.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {
    private final ConnectionService connectionService;
    private final JwtService jwtService;

    public ConnectionController(ConnectionService connectionService, JwtService jwtService) {
        this.connectionService = connectionService;
        this.jwtService = jwtService;
    }

    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> requestConnection(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        String doctorId = String.valueOf(body.get("doctorId"));
        @SuppressWarnings("unchecked")
        List<String> recordIds = (List<String>) body.getOrDefault("recordIds", List.of());
        return ResponseEntity.ok(connectionService.requestConnection(user.userId(), doctorId, recordIds));
    }

    @GetMapping("/check/{doctorId}")
    public ResponseEntity<Map<String, Object>> checkConnection(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String doctorId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(connectionService.checkConnection(user.userId(), doctorId));
    }

    @GetMapping("/patient")
    public ResponseEntity<Map<String, Object>> patientConnections(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(connectionService.getPatientConnections(user.userId()));
    }

    @GetMapping("/doctor")
    public ResponseEntity<Map<String, Object>> doctorConnections(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(connectionService.getDoctorConnections(user.userId()));
    }

    @PatchMapping("/{connectionId}/respond")
    public ResponseEntity<Map<String, Object>> respond(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String connectionId,
            @RequestBody Map<String, String> body
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(connectionService.respondToConnection(user.userId(), connectionId, body.get("action")));
    }

    @DeleteMapping("/{connectionId}/revoke")
    public ResponseEntity<Map<String, Object>> revoke(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String connectionId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(connectionService.revokeConnection(user.userId(), connectionId));
    }
}
