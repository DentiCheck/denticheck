package com.denticheck.api.domain.chatbot.repository;

import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSessionEntity, UUID> {
    Optional<ChatSessionEntity> findByUserIdAndChannelAndEndedAtIsNull(UUID userId, String channel);

    long countByCreatedAtAfter(java.time.LocalDateTime start);
}
