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
import com.denticheck.api.common.exception.user.UserException;
import com.denticheck.api.common.exception.user.UserErrorCode;

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
        log.debug("startSession() 실행");
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
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
        log.debug("getChatHistory() 실행");
        return aiChatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Override
    @Transactional
    public ChatAppResponse processMessage(ChatAppRequest request, UUID userId, String channel) {
        log.debug("processMessage() 실행");
        String content = request.getContent();
        ChatMessageType messageType = request.getMessageType() != null ? request.getMessageType()
                : ChatMessageType.TEXT;
        Map<String, Object> payload = request.getPayload();

        if (content == null || content.trim().isEmpty()) {
            content = "Please provide a valid message.";
        } else {
            content = content.trim();
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        ChatSessionEntity session = getOrCreateActiveSession(user, channel);

        // 1. 사용자 메시지 저장
        AiChatMessageEntity userMessage = AiChatMessageEntity.builder()
                .session(session)
                .role(ChatRole.USER)
                .content(content)
                .messageType(messageType)
                .payload(payload)
                .language("en")
                .build();
        aiChatMessageRepository.save(userMessage);

        // 세션 메타데이터 업데이트
        session.touchLastMessage(preview(content));

        // 2. AI 서버 호출
        String aiContent;
        try {
            String rawResponse = aiClient.askChat(AiChatAskRequest.builder()
                    .content(content)
                    .language("en")
                    .build());

            // Null 또는 빈 문자열인 경우 기본 메시지 할당
            if (rawResponse == null || rawResponse.trim().isEmpty()) {
                log.warn("AI 서버로부터 빈 응답을 받았습니다. sessionId: {}", session.getId());
                aiContent = "I could not generate a response. Could you ask with a bit more detail?";
            } else {
                aiContent = rawResponse;
            }
        } catch (Exception e) {
            log.error("AI 서버 호출 중 오류가 발생했습니다: {}", e.getMessage());
            aiContent = "Sorry, the AI service is temporarily unavailable. Please try again shortly.";
        }

        ChatMessageType aiMessageType = ChatMessageType.TEXT;
        Map<String, Object> aiPayload = null;

        // 3. 챗봇 응답 메시지 저장
        AiChatMessageEntity aiMessage = AiChatMessageEntity.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .content(aiContent)
                .messageType(aiMessageType)
                .payload(aiPayload)
                .language("en")
                .build();
        AiChatMessageEntity savedAiMessage = aiChatMessageRepository.save(aiMessage);

        session.touchLastMessage(preview(aiContent));

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
        log.debug("endSession() 실행");
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
