package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.ConnectionEntity;
import com.example.usermicroservice.Entity.MessageEntity;
import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.repository.MessageRepository;
import com.example.usermicroservice.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MessageService {
    private final MessageRepository messageRepository;
    private final ConnectionService connectionService;
    private final UserAccountRepository userAccountRepository;

    public MessageService(MessageRepository messageRepository, ConnectionService connectionService, UserAccountRepository userAccountRepository) {
        this.messageRepository = messageRepository;
        this.connectionService = connectionService;
        this.userAccountRepository = userAccountRepository;
    }

    public Map<String, Object> sendMessage(String userId, String connectionId, String content) {
        ConnectionEntity connection = connectionService.loadConnectionForUser(userId, connectionId);
        String receiverId = userId.equals(connection.getPatientId()) ? connection.getDoctorId() : connection.getPatientId();

        MessageEntity m = new MessageEntity();
        m.setConnectionId(connectionId);
        m.setSenderId(userId);
        m.setReceiverId(receiverId);
        m.setContent(content);
        m.setRead(false);
        m.setHasAttachment(false);

        MessageEntity saved = messageRepository.save(m);
        return Map.of("success", true, "message", toMessage(saved));
    }

    public Map<String, Object> getMessages(String userId, String connectionId) {
        connectionService.loadConnectionForUser(userId, connectionId);
        List<Map<String, Object>> messages = messageRepository.findByConnectionIdOrderByCreatedAtAsc(connectionId)
                .stream().map(this::toMessage).toList();
        return Map.of("success", true, "messages", messages);
    }

    public Map<String, Object> getConversations(String userId) {
        List<ConnectionEntity> connections = connectionService.allConnectionsForUser(userId);
        Map<String, List<MessageEntity>> messagesByConnection = messageRepository
                .findByConnectionIdInOrderByCreatedAtDesc(connections.stream().map(ConnectionEntity::getId).distinct().toList())
                .stream()
                .collect(Collectors.groupingBy(MessageEntity::getConnectionId));

        List<Map<String, Object>> conversations = connections.stream()
                .map(c -> {
                    boolean userIsPatient = userId.equals(c.getPatientId());
                    String participantId = userIsPatient ? c.getDoctorId() : c.getPatientId();
                    UserAccount participant = userAccountRepository.findById(participantId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
                    List<MessageEntity> msgs = messagesByConnection.getOrDefault(c.getId(), List.of());
                    MessageEntity latest = msgs.stream().max(Comparator.comparing(MessageEntity::getCreatedAt)).orElse(null);
                    int unread = (int) msgs.stream().filter(m -> userId.equals(m.getReceiverId()) && !m.isRead()).count();
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("connectionId", c.getId());
                    out.put("participantId", participantId);
                    out.put("participantName", participant.getFirstName() + " " + participant.getLastName());
                    out.put("participantRole", userIsPatient ? "doctor" : "patient");
                    out.put("lastMessage", latest != null ? latest.getContent() : "");
                    out.put("lastMessageTime", latest != null ? latest.getCreatedAt() : c.getUpdatedAt());
                    out.put("unreadCount", unread);
                    out.put("online", false);
                    return out;
                })
                .sorted((a, b) -> String.valueOf(b.get("lastMessageTime")).compareTo(String.valueOf(a.get("lastMessageTime"))))
                .toList();
        return Map.of("success", true, "conversations", conversations);
    }

    public Map<String, Object> markAsRead(String userId, String connectionId) {
        connectionService.loadConnectionForUser(userId, connectionId);
        List<MessageEntity> unread = messageRepository.findByConnectionIdAndReceiverIdAndIsReadFalse(connectionId, userId);
        unread.forEach(m -> m.setRead(true));
        messageRepository.saveAll(unread);
        return Map.of("success", true);
    }

    public Map<String, Object> getUnreadCount(String userId) {
        long unread = messageRepository.findByReceiverIdAndIsReadFalse(userId).size();
        return Map.of("success", true, "unreadCount", unread);
    }

    public Map<String, Object> deleteMessage(String userId, String messageId) {
        MessageEntity m = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        if (!userId.equals(m.getSenderId()) && !userId.equals(m.getReceiverId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this message");
        }
        messageRepository.delete(m);
        return Map.of("success", true);
    }

    private Map<String, Object> toMessage(MessageEntity m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("_id", m.getId());
        out.put("connection", m.getConnectionId());
        out.put("sender", m.getSenderId());
        out.put("receiver", m.getReceiverId());
        out.put("content", m.getContent());
        out.put("isRead", m.isRead());
        out.put("hasAttachment", m.isHasAttachment());
        out.put("attachmentName", m.getAttachmentName());
        out.put("attachmentUrl", m.getAttachmentUrl());
        out.put("createdAt", m.getCreatedAt());
        out.put("updatedAt", m.getUpdatedAt());
        return out;
    }
}
