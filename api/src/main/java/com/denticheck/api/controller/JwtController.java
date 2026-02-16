package com.denticheck.api.controller;

import com.denticheck.api.security.jwt.dto.JWTResponseDTO;
import com.denticheck.api.security.jwt.dto.LogoutRequestDTO;
import com.denticheck.api.security.jwt.dto.RefreshRequestDTO;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@RestController
@RequiredArgsConstructor
public class JwtController {

    private final JwtServiceImpl jwtServiceImpl;

    // 소셜 로그인 쿠키 방식의 Refresh 토큰 헤더 방식으로 교환
    @PostMapping(value = "/jwt/exchange", consumes = MediaType.APPLICATION_JSON_VALUE)
    public JWTResponseDTO jwtExchangeApi(
            HttpServletRequest request,
            HttpServletResponse response) {
        return jwtServiceImpl.cookie2Header(request, response);
    }

    // Refresh 토큰으로 Access 토큰 재발급 (Rotate 포함)
    @PostMapping(value = "/jwt/refresh", consumes = MediaType.APPLICATION_JSON_VALUE)
    public JWTResponseDTO jwtRefreshApi(
            @Validated @RequestBody RefreshRequestDTO dto) {
        return jwtServiceImpl.refreshRotate(dto);
    }

    // 로그아웃 (Refresh 토큰 삭제)
    @PostMapping(value = "/jwt/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> logout(
            @Validated @RequestBody LogoutRequestDTO dto) {
        jwtServiceImpl.removeRefresh(dto.refreshToken());
        return ResponseEntity.ok().build();
    }
}
