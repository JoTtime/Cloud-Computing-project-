package com.example.usermicroservice.repository;

import com.example.usermicroservice.Entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, String> {
    List<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId);
    long countByRecipientIdAndIsReadFalse(String recipientId);
}
