package com.example.usermicroservice.controller;

import com.example.usermicroservice.dto.response.AuthenticatedUser;
import com.example.usermicroservice.service.JwtService;
import com.example.usermicroservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final JwtService jwtService;

    public NotificationController(NotificationService notificationService, JwtService jwtService) {
        this.notificationService = notificationService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(Map.of("success", true, "notifications", notificationService.getNotifications(user.userId())));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(Map.of("success", true, "unreadCount", notificationService.getUnreadCount(user.userId())));
    }

    @GetMapping("/stream")
    public SseEmitter streamNotifications(@RequestParam String token) {
        AuthenticatedUser user = jwtService.authenticateToken(token);
        return notificationService.subscribe(user.userId());
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markRead(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String notificationId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        notificationService.markAsRead(user.userId(), notificationId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String notificationId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        notificationService.deleteNotification(user.userId(), notificationId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}