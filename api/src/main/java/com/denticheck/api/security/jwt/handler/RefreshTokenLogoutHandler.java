package com.denticheck.api.security.jwt.handler;

import com.denticheck.api.common.util.JWTUtil;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

@RequiredArgsConstructor
public class RefreshTokenLogoutHandler implements LogoutHandler {

    private final JwtServiceImpl jwtServiceImpl;
    private final JWTUtil jwtUtil;

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        try {
            String body;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(request.getInputStream()))) {
                body = reader.lines().reduce("", String::concat);
            }

            if (!StringUtils.hasText(body))
                return;

            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonNode = mapper.readTree(body);
            String refreshToken = jsonNode.has("refreshToken") ? jsonNode.get("refreshToken").asText() : null;

            // 유효성 검증
            if (refreshToken == null)
                return;
            if (!jwtUtil.isValid(refreshToken, false))
                return;

            // Refresh 토큰 삭제
            jwtServiceImpl.removeRefresh(refreshToken);

        } catch (IOException e) {
            throw new RuntimeException("Failed to read refresh token", e);
        }
    }

}