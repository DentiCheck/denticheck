package com.denticheck.api.domain.chatbot.service;

import com.denticheck.api.domain.chatbot.entity.AiChatMessageEntity;
import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;

import java.util.List;
import java.util.UUID;

import com.denticheck.api.domain.chatbot.dto.ChatAppRequest;
import com.denticheck.api.domain.chatbot.dto.ChatAppResponse;

public interface ChatService {

    ChatSessionEntity startSession(UUID userId, String channel);

    List<AiChatMessageEntity> getChatHistory(UUID sessionId);

    ChatAppResponse processMessage(ChatAppRequest request, UUID userId, String channel);

    void endSession(UUID userId, String channel);
}
