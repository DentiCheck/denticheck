package com.denticheck.api.domain.chatbot.service.impl;

import com.denticheck.api.domain.chatbot.entity.AiChatMessageEntity;
import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;
import com.denticheck.api.domain.chatbot.repository.AiChatMessageRepository;
import com.denticheck.api.domain.chatbot.repository.ChatSessionRepository;
import com.denticheck.api.domain.chatbot.service.ChatService;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final UserRepository userRepository;
    // private final AiReportRepository aiReportRepository; // Removed unused
    // dependency
    private final ObjectMapper objectMapper;

    // Session ID -> SseEmitter Map
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    private static final String AI_CHAT_URL = "http://localhost:8000/v1/chat/ask";
    private static final String AI_REPORT_URL = "http://localhost:8000/v1/report/generate";

    @Override
    @Transactional
    public ChatSessionEntity startSession(UUID userId, String channel) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ChatSessionEntity session = ChatSessionEntity.builder()
                .user(user)
                .channel(channel)
                .build();

        return chatSessionRepository.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageEntity> getChatHistory(UUID sessionId) {
        return aiChatMessageRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Override
    public SseEmitter subscribe(UUID sessionId) {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L); // 1 hour timeout
        emitters.put(sessionId, emitter);

        emitter.onCompletion(() -> emitters.remove(sessionId));
        emitter.onTimeout(() -> emitters.remove(sessionId));
        emitter.onError((e) -> emitters.remove(sessionId));

        return emitter;
    }

    @Override
    @Transactional
    public AiChatMessageEntity processMessage(UUID sessionId, String content, String language) {
        ChatSessionEntity session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        // 1. Save User Message
        AiChatMessageEntity userMessage = AiChatMessageEntity.builder()
                .session(session)
                .role("user")
                .content(content)
                .language(language)
                .build();
        aiChatMessageRepository.save(userMessage);

        // 2. Call AI Server
        String aiResponseJson = callAiServer(sessionId, content, language);

        // 3. Parse AI Response
        String aiContent;
        String citation = null;
        try {
            JsonNode root = objectMapper.readTree(aiResponseJson);
            // Assuming simplified response structure for now, adjust based on actual AI
            // server response
            // Example: { "content": "Hello", "citation": {...}, "report": {...} }
            if (root.has("choices") && root.get("choices").isArray()) {
                // OpenAI Format
                aiContent = root.get("choices").get(0).get("message").get("content").asText();
            } else {
                // Custom Format
                aiContent = root.path("content").asText();
                if (root.has("citation")) {
                    JsonNode citationNode = root.get("citation");
                    if (citationNode != null && !citationNode.isNull()) {
                        citation = objectMapper.writeValueAsString(citationNode);
                    }
                }
                // Handle AI Report if present
                if (root.has("report")) {
                    saveAiReport(session, root.get("report"), language);
                }
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse AI response", e);
            aiContent = "Error processing AI response.";
        }

        // 4. Save Assistant Message
        AiChatMessageEntity aiMessage = AiChatMessageEntity.builder()
                .session(session)
                .role("assistant")
                .content(aiContent)
                .language(language)
                .citation(citation)
                .build();
        AiChatMessageEntity savedAiMessage = aiChatMessageRepository.save(aiMessage);

        // 5. Push to SSE
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data(savedAiMessage));
            } catch (IOException e) {
                emitters.remove(sessionId);
            }
        }

        return savedAiMessage;
    }

    private String callAiServer(UUID sessionId, String content, String language) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Construct request body
        // Adjust this structure to match what the Python AI server expects
        Map<String, Object> requestBody = Map.of(
                "session_id", sessionId.toString(),
                "message", content,
                "language", language != null ? language : "ko");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(AI_CHAT_URL, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error calling AI server", e);
            throw new RuntimeException("AI Server Error");
        }
    }

    private void saveAiReport(ChatSessionEntity session, JsonNode reportNode, String language) {
        // TODO: AI Report now requires an AiCheckSessionEntity
        // (AiReportEntity.session).
        // The current ChatSessionEntity does not link to AiCheckSessionEntity.
        // We need to either pass the check session ID in the chat request or redesign
        // this flow.
        // For now, we log the report content and skip saving.

        log.warn(
                "Received AI Report for chat session {}, but cannot save because no AiCheckSession is linked. Report: {}",
                session.getId(), reportNode);

        /*
         * String summary = reportNode.path("summary").asText();
         * String routineGuide = reportNode.path("routine_guide").asText();
         * String warnings = reportNode.path("warnings").asText();
         * String disclaimerVersion = reportNode.path("disclaimer_version").asText();
         * 
         * AiReportEntity report = AiReportEntity.builder()
         * .summary(summary)
         * .details("Checkup required")
         * .disclaimer("Consult a dentist")
         * .disclaimerVersion(disclaimerVersion)
         * .language(language)
         * .build();
         * 
         * // aiReportRepository.save(report);
         */
    }
}
