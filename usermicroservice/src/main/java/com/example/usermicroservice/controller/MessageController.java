package com.example.usermicroservice.controller;

import com.example.usermicroservice.dto.response.AuthenticatedUser;
import com.example.usermicroservice.service.JwtService;
import com.example.usermicroservice.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    private final MessageService messageService;
    private final JwtService jwtService;

    public MessageController(MessageService messageService, JwtService jwtService) {
        this.messageService = messageService;
        this.jwtService = jwtService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> send(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        String connectionId = String.valueOf(body.get("connectionId"));
        String content = String.valueOf(body.getOrDefault("content", ""));
        return ResponseEntity.ok(messageService.sendMessage(user.userId(), connectionId, content));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> sendWithAttachment(
            @RequestHeader("Authorization") String authorization,
            @RequestParam String connectionId,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile attachment
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        String text = content == null ? "" : content;
        if (attachment != null && (text == null || text.isBlank())) {
            text = "Sent " + attachment.getOriginalFilename();
        }
        return ResponseEntity.ok(messageService.sendMessage(user.userId(), connectionId, text));
    }

    @GetMapping("/connection/{connectionId}")
    public ResponseEntity<Map<String, Object>> getMessages(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String connectionId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(messageService.getMessages(user.userId(), connectionId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<Map<String, Object>> getConversations(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(messageService.getConversations(user.userId()));
    }

    @PatchMapping("/connection/{connectionId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String connectionId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(messageService.markAsRead(user.userId(), connectionId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(messageService.getUnreadCount(user.userId()));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Map<String, Object>> delete(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String messageId
    ) {
        AuthenticatedUser user = jwtService.authenticate(authorization);
        return ResponseEntity.ok(messageService.deleteMessage(user.userId(), messageId));
    }
}
