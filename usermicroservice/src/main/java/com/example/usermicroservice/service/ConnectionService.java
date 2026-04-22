package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.ConnectionEntity;
import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.repository.ConnectionRepository;
import com.example.usermicroservice.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ConnectionService {
    private final ConnectionRepository connectionRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationService notificationService;

    public ConnectionService(ConnectionRepository connectionRepository, UserAccountRepository userAccountRepository, NotificationService notificationService) {
        this.connectionRepository = connectionRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationService = notificationService;
    }

    public Map<String, Object> requestConnection(String patientId, String doctorId, List<String> recordIds) {
        UserAccount patient = loadUser(patientId);
        UserAccount doctor = loadUser(doctorId);
        if (!"patient".equalsIgnoreCase(patient.getUserType().name())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can request connections");
        }
        if (!"doctor".equalsIgnoreCase(doctor.getUserType().name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target user is not a doctor");
        }

        ConnectionEntity connection = connectionRepository.findByPatientIdAndDoctorIdAndStatusNot(patientId, doctorId, "revoked")
                .orElseGet(ConnectionEntity::new);
        connection.setPatientId(patientId);
        connection.setDoctorId(doctorId);
        connection.setStatus("pending");
        connection.setRecords(recordIds == null ? List.of() : recordIds);
        ConnectionEntity saved = connectionRepository.save(connection);

        notificationService.createConnectionNotification(
                saved,
                doctorId,
                patientId,
                "CONNECTION_REQUEST",
                patient.getFirstName() + " " + patient.getLastName() + " sent you a connection request"
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Connection request sent");
        response.put("connection", toConnectionDto(saved));
        return response;
    }

    public Map<String, Object> checkConnection(String patientId, String doctorId) {
        ConnectionEntity c = connectionRepository.findByPatientIdAndDoctorIdAndStatusNot(patientId, doctorId, "revoked").orElse(null);
        boolean isConnected = c != null && "accepted".equals(c.getStatus());
        boolean isPending = c != null && "pending".equals(c.getStatus());
        return Map.of("success", true, "isConnected", isConnected, "isPending", isPending);
    }

    public Map<String, Object> getPatientConnections(String patientId) {
        List<Map<String, Object>> data = connectionRepository.findByPatientIdAndStatusNotOrderByUpdatedAtDesc(patientId, "revoked")
                .stream().map(this::toConnectionDto).toList();
        return Map.of("success", true, "connections", data);
    }

    public Map<String, Object> getDoctorConnections(String doctorId) {
        List<Map<String, Object>> data = connectionRepository.findByDoctorIdAndStatusNotOrderByUpdatedAtDesc(doctorId, "revoked")
                .stream().map(this::toConnectionDto).toList();
        return Map.of("success", true, "connections", data);
    }

    public Map<String, Object> respondToConnection(String doctorId, String connectionId, String action) {
        ConnectionEntity c = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Connection not found"));
        if (!doctorId.equals(c.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned doctor can respond");
        }
        if (!"pending".equals(c.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Connection is no longer pending");
        }
        String normalized = action == null ? "" : action.trim().toLowerCase();
        if (!normalized.equals("accept") && !normalized.equals("reject")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action must be accept or reject");
        }
        c.setStatus(normalized.equals("accept") ? "accepted" : "rejected");
        ConnectionEntity saved = connectionRepository.save(c);

        UserAccount doctor = loadUser(doctorId);
        notificationService.createConnectionNotification(
                saved,
                c.getPatientId(),
                doctorId,
                normalized.equals("accept") ? "CONNECTION_ACCEPTED" : "CONNECTION_REJECTED",
                "Dr. " + doctor.getFirstName() + " " + doctor.getLastName() + " " + (normalized.equals("accept") ? "accepted" : "rejected") + " your connection request"
        );
        return Map.of("success", true, "message", "Connection " + (normalized.equals("accept") ? "accepted" : "rejected"), "connection", toConnectionDto(saved));
    }

    public Map<String, Object> revokeConnection(String userId, String connectionId) {
        ConnectionEntity c = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Connection not found"));
        if (!userId.equals(c.getDoctorId()) && !userId.equals(c.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to revoke this connection");
        }
        c.setStatus("revoked");
        connectionRepository.save(c);
        return Map.of("success", true, "message", "Connection revoked");
    }

    public ConnectionEntity loadConnectionForUser(String userId, String connectionId) {
        ConnectionEntity c = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Connection not found"));
        if (!userId.equals(c.getDoctorId()) && !userId.equals(c.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Connection does not belong to you");
        }
        if ("revoked".equals(c.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Connection is revoked");
        }
        return c;
    }

    public List<ConnectionEntity> allConnectionsForUser(String userId) {
        List<ConnectionEntity> out = new ArrayList<>();
        out.addAll(connectionRepository.findByPatientIdAndStatusNotOrderByUpdatedAtDesc(userId, "revoked"));
        out.addAll(connectionRepository.findByDoctorIdAndStatusNotOrderByUpdatedAtDesc(userId, "revoked"));
        return out;
    }

    private Map<String, Object> toConnectionDto(ConnectionEntity c) {
        UserAccount patient = loadUser(c.getPatientId());
        UserAccount doctor = loadUser(c.getDoctorId());
        return Map.of(
                "_id", c.getId(),
                "patient", userToMap(patient),
                "doctor", userToMap(doctor),
                "records", c.getRecords(),
                "status", c.getStatus(),
                "createdAt", c.getCreatedAt(),
                "updatedAt", c.getUpdatedAt()
        );
    }

    private Map<String, Object> userToMap(UserAccount u) {
        return Map.of(
                "_id", u.getId(),
                "userId", u.getId(),
                "firstName", u.getFirstName(),
                "lastName", u.getLastName(),
                "email", u.getEmail(),
                "phone", u.getPhone() == null ? "" : u.getPhone()
        );
    }

    private UserAccount loadUser(String userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));
    }
}
