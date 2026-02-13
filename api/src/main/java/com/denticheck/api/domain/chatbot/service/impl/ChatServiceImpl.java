package com.denticheck.api.domain.chatbot.service.impl;

import com.denticheck.api.domain.chatbot.entity.AiChatMessageEntity;
import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;
import com.denticheck.api.domain.chatbot.repository.AiChatMessageRepository;
import com.denticheck.api.domain.chatbot.repository.ChatSessionRepository;
import com.denticheck.api.domain.chatbot.service.ChatService;
import com.denticheck.api.domain.chatbot.dto.ChatAppRequest;
import com.denticheck.api.domain.chatbot.dto.ChatAppResponse;
import com.denticheck.api.domain.chatbot.entity.ChatMessageType;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import com.denticheck.api.infrastructure.external.ai.AiClient;
import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.denticheck.api.domain.chatbot.entity.ChatRole;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final UserRepository userRepository;
    private final AiClient aiClient;

    @Override
    @Transactional
    public ChatSessionEntity startSession(UUID userId, String channel) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return getOrCreateActiveSession(user, channel);
    }

    private ChatSessionEntity getOrCreateActiveSession(UserEntity user, String channel) {
        return chatSessionRepository.findByUserIdAndChannelAndEndedAtIsNull(user.getId(), channel)
                .orElseGet(() -> {
                    log.info("새 채팅 세션을 시작합니다. 사용자: {}, 채널: {}", user.getId(), channel);
                    ChatSessionEntity session = ChatSessionEntity.builder()
                            .user(user)
                            .channel(channel)
                            .build();
                    return chatSessionRepository.save(session);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageEntity> getChatHistory(UUID sessionId) {
        return aiChatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Override
    @Transactional
    public ChatAppResponse processMessage(ChatAppRequest request, UUID userId, String channel) {
        String content = request.getContent();
        ChatMessageType messageType = request.getMessageType() != null ? request.getMessageType()
                : ChatMessageType.TEXT;
        Map<String, Object> payload = request.getPayload();

        log.info("사용자로부터 채팅 메시지를 수신했습니다. 사용자: {}, 채널: {}, 내용: {}", userId, channel, content);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        ChatSessionEntity session = getOrCreateActiveSession(user, channel);

        // 1. Save User Message
        AiChatMessageEntity userMessage = AiChatMessageEntity.builder()
                .session(session)
                .role(ChatRole.USER)
                .content(content)
                .messageType(messageType)
                .payload(payload)
                .language("ko") // Default to Korean for now
                .build();
        aiChatMessageRepository.save(userMessage);

        // Update Session Metadata
        session.touchLastMessage(preview(content));

        // 2. Call AI Server
        String aiContent;
        try {
            String rawResponse = aiClient.askChat(AiChatAskRequest.builder()
                    .content(content)
                    .language("ko")
                    .build());

            // Null 또는 빈 문자열인 경우 기본 메시지 할당
            if (rawResponse == null || rawResponse.trim().isEmpty()) {
                log.warn("AI 서버로부터 빈 응답을 받았습니다. sessionId: {}", session.getId());
                aiContent = "AI가 답변을 생성하지 못했습니다. 질문을 조금 더 구체적으로 말씀해 주시겠어요?";
            } else {
                aiContent = rawResponse;
            }
        } catch (Exception e) {
            log.error("AI 서버 호출 중 오류가 발생했습니다: {}", e.getMessage());
            aiContent = "죄송합니다. 현재 AI 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }

        ChatMessageType aiMessageType = ChatMessageType.TEXT;
        Map<String, Object> aiPayload = null;

        // 3. Save Assistant Message
        AiChatMessageEntity aiMessage = AiChatMessageEntity.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .content(aiContent)
                .messageType(aiMessageType)
                .payload(aiPayload)
                .language("ko")
                .build();
        AiChatMessageEntity savedAiMessage = aiChatMessageRepository.save(aiMessage);

        session.touchLastMessage(preview(aiContent));

        // 4. Push to SSE (Optional for simple HTTP request/response)
        // ... (Keep existing if needed, or remove if moving to pure HTTP)

        log.info("AI 응답 생성 완료: sessionId={}, 내용={}", session.getId(), savedAiMessage.getContent());

        return ChatAppResponse.builder()
                .sessionId(session.getId())
                .userMessageId(userMessage.getId())
                .assistantMessageId(savedAiMessage.getId())
                .assistantContent(savedAiMessage.getContent())
                .messageType(savedAiMessage.getMessageType())
                .payload(savedAiMessage.getPayload())
                .build();
    }

    @Override
    @Transactional
    public void endSession(UUID userId, String channel) {
        chatSessionRepository.findByUserIdAndChannelAndEndedAtIsNull(userId, channel)
                .ifPresent(session -> {
                    log.info("채팅 세션을 종료합니다: {}", session.getId());
                    session.endSession();
                });
    }

    private String preview(String content) {
        if (content == null)
            return "Picture/Card";
        return content.length() <= 30 ? content : content.substring(0, 30) + "...";
    }
}
