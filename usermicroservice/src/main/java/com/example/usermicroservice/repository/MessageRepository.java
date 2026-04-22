package com.example.usermicroservice.repository;

import com.example.usermicroservice.Entity.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, String> {
    List<MessageEntity> findByConnectionIdOrderByCreatedAtAsc(String connectionId);
    List<MessageEntity> findByConnectionIdInOrderByCreatedAtDesc(List<String> connectionIds);
    List<MessageEntity> findByReceiverIdAndIsReadFalse(String receiverId);
    List<MessageEntity> findByConnectionIdAndReceiverIdAndIsReadFalse(String connectionId, String receiverId);
}
