package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.ConnectionEntity;
import com.example.usermicroservice.Entity.NotificationEntity;
import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.repository.NotificationRepository;
import com.example.usermicroservice.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserAccountRepository userAccountRepository;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public NotificationService(NotificationRepository notificationRepository, UserAccountRepository userAccountRepository) {
        this.notificationRepository = notificationRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public void createConnectionNotification(ConnectionEntity connection, String recipientId, String senderId, String type, String message) {
        NotificationEntity n = new NotificationEntity();
        n.setRecipientId(recipientId);
        n.setSenderId(senderId);
        n.setType(type);
        n.setMessage(message);
        n.setRead(false);
        n.setRelatedConnectionId(connection.getId());
        n.setRelatedConnectionStatus(connection.getStatus());
        NotificationEntity saved = notificationRepository.save(n);
        pushEvent(recipientId, "notification", Map.of(
                "type", saved.getType(),
                "notificationId", saved.getId(),
                "message", saved.getMessage(),
                "createdAt", LocalDateTime.now().toString()
        ));
    }

    public void createAppointmentNotification(
            String recipientId,
            String senderId,
            String type,
            String message,
            String appointmentId,
            String appointmentStatus,
            String appointmentDate
    ) {
        NotificationEntity n = new NotificationEntity();
        n.setRecipientId(recipientId);
        n.setSenderId(senderId);
        n.setType(type);
        n.setMessage(message);
        n.setRead(false);
        n.setRelatedAppointmentId(appointmentId);
        n.setRelatedAppointmentStatus(appointmentStatus);
        n.setRelatedAppointmentDate(appointmentDate);
        NotificationEntity saved = notificationRepository.save(n);
        pushEvent(recipientId, "notification", Map.of(
                "type", saved.getType(),
                "notificationId", saved.getId(),
                "message", saved.getMessage(),
                "createdAt", LocalDateTime.now().toString()
        ));
    }

    public List<Map<String, Object>> getNotifications(String recipientId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId).stream()
                .map(n -> {
                    UserAccount sender = userAccountRepository.findById(n.getSenderId()).orElse(null);
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("_id", n.getId());
                    out.put("recipient", n.getRecipientId());
                    out.put("sender", Map.of(
                            "_id", n.getSenderId(),
                            "firstName", sender != null ? sender.getFirstName() : "User",
                            "lastName", sender != null ? sender.getLastName() : ""
                    ));
                    out.put("type", n.getType());
                    out.put("message", n.getMessage());
                    out.put("isRead", n.isRead());
                    if (n.getRelatedConnectionId() != null) {
                        out.put("relatedConnection", Map.of(
                                "_id", n.getRelatedConnectionId(),
                                "status", n.getRelatedConnectionStatus() != null ? n.getRelatedConnectionStatus() : "pending"
                        ));
                    }
                    if (n.getRelatedAppointmentId() != null) {
                        out.put("relatedAppointment", Map.of(
                                "_id", n.getRelatedAppointmentId(),
                                "status", n.getRelatedAppointmentStatus() != null ? n.getRelatedAppointmentStatus() : "pending",
                                "date", n.getRelatedAppointmentDate() != null ? n.getRelatedAppointmentDate() : ""
                        ));
                    }
                    out.put("createdAt", n.getCreatedAt());
                    out.put("updatedAt", n.getUpdatedAt());
                    return out;
                })
                .toList();
    }

    public long getUnreadCount(String recipientId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
    }

    public void markAsRead(String recipientId, String notificationId) {
        NotificationEntity n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!recipientId.equals(n.getRecipientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification does not belong to you");
        }
        n.setRead(true);
        notificationRepository.save(n);
        pushEvent(recipientId, "notification-read", Map.of("notificationId", notificationId));
    }

    public void deleteNotification(String recipientId, String notificationId) {
        NotificationEntity n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!recipientId.equals(n.getRecipientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification does not belong to you");
        }
        notificationRepository.delete(n);
        pushEvent(recipientId, "notification-deleted", Map.of("notificationId", notificationId));
    }

    public SseEmitter subscribe(String recipientId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(recipientId, emitter);

        emitter.onCompletion(() -> emitters.remove(recipientId));
        emitter.onTimeout(() -> emitters.remove(recipientId));
        emitter.onError((ex) -> emitters.remove(recipientId));

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of("connected", true, "recipientId", recipientId)));
        } catch (IOException ex) {
            emitters.remove(recipientId);
        }
        return emitter;
    }

    private void pushEvent(String recipientId, String eventName, Map<String, Object> payload) {
        SseEmitter emitter = emitters.get(recipientId);
        if (emitter == null) {
            return;
        }
        try {
            emitter.send(SseEmitter.event().name(eventName).data(payload));
        } catch (IOException ex) {
            emitters.remove(recipientId);
        }
    }
}