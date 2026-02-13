package com.denticheck.api.security.jwt.service.impl;

import com.denticheck.api.common.util.JWTUtil;
import com.denticheck.api.security.jwt.dto.JWTResponseDTO;
import com.denticheck.api.security.jwt.dto.RefreshRequestDTO;
import com.denticheck.api.security.jwt.entity.RefreshEntity;
import com.denticheck.api.security.jwt.repository.RefreshRepository;
import com.denticheck.api.security.jwt.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtServiceImpl implements JwtService {

    private final RefreshRepository refreshRepository;
    private final JWTUtil jwtUtil;

    @Value("${admin.web.refresh-cookie-max-age-seconds}")
    int refreshCookieMaxAgeSeconds;

    @Value("${admin.web.refresh-cookie-secure}")
    boolean refreshCookieSecure;

    @Value("${admin.web.refresh-cookie-httponly}")
    boolean refreshCookieHttpOnly;

    // 소셜 로그인 성공 후 쿠키(Refresh) -> 헤더 방식으로 응답
    @Transactional
    @Override
    public JWTResponseDTO cookie2Header(HttpServletRequest request, HttpServletResponse response) {

        // 쿠키 리스트에서 Refresh 쿠키 확인
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            throw new RuntimeException("쿠키가 존재하지 않습니다.");
        }

        // Refresh 토큰 획득
        String refreshToken = null;
        for (Cookie cookie : cookies) {
            if ("refreshToken".equals(cookie.getName())) {
                refreshToken = cookie.getValue();
                break;
            }
        }

        if (refreshToken == null) {
            throw new RuntimeException("refreshToken 쿠키가 없습니다.");
        }

        // Refresh 토큰 검증
        if (!jwtUtil.isValid(refreshToken, false)) {
            throw new RuntimeException("유효하지 않은 refreshToken입니다.");
        }

        if (!existRefresh(refreshToken)) {
            throw new RuntimeException("만료(폐기)된 refreshToken입니다. 다시 로그인 해주세요.");
        }

        // 정보 추출
        String username = jwtUtil.getUsername(refreshToken);
        String role = jwtUtil.getRole(refreshToken);

        // 토큰 생성
        String newAccessToken = jwtUtil.createAccessJWT(username, role);
        String newRefreshToken = jwtUtil.createRefreshJWT(username, role);

        // 기존 Refresh 토큰 DB 삭제 후 신규 추가
        removeRefresh(refreshToken);
        refreshRepository.flush(); // 같은 트랜잭션 내부라 : 삭제 -> 생성 문제 해결
        refreshRepository.save(RefreshEntity.builder()
                .username(username)
                .refresh(newRefreshToken)
                .build());

        // 기존 쿠키 제거
        Cookie refreshCookie = new Cookie("refreshToken", null);
        refreshCookie.setHttpOnly(refreshCookieHttpOnly);
        refreshCookie.setSecure(refreshCookieSecure);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(refreshCookieMaxAgeSeconds);
        response.addCookie(refreshCookie);

        return new JWTResponseDTO(newAccessToken, newRefreshToken, null);
    }

    // Refresh 토큰으로 Access 토큰 재발급 로직 (Rotate 포함)
    @Transactional
    @Override
    public JWTResponseDTO refreshRotate(RefreshRequestDTO dto) {

        String refreshToken = dto.getRefreshToken();

        // Refresh 토큰 검증
        if (!jwtUtil.isValid(refreshToken, false)) {
            throw new RuntimeException("유효하지 않은 refreshToken입니다.");
        }

        if (!existRefresh(refreshToken)) {
            throw new RuntimeException("만료(폐기)된 refreshToken입니다. 다시 로그인 해주세요.");
        }

        // 정보 추출
        String username = jwtUtil.getUsername(refreshToken);
        String role = jwtUtil.getRole(refreshToken);

        // 토큰 생성
        String newAccessToken = jwtUtil.createAccessJWT(username, role);
        String newRefreshToken = jwtUtil.createRefreshJWT(username, role);

        // 기존 Refresh 토큰 DB 삭제 후 신규 추가
        removeRefresh(refreshToken);
        refreshRepository.save(RefreshEntity.builder()
                .username(username)
                .refresh(newRefreshToken)
                .build());

        return new JWTResponseDTO(newAccessToken, newRefreshToken, null);
    }

    // JWT Refresh 토큰 발급 후 저장 메소드
    @Transactional
    @Override
    public void addRefresh(String username, String refreshToken) {
        // 단일 세션(계정당 기기 1개) 허용을 위해 기존 토큰 모두 삭제
        removeRefreshUser(username);

        refreshRepository.save(RefreshEntity.builder()
                .username(username)
                .refresh(refreshToken)
                .build());
    }

    // JWT Refresh 존재 확인 메소드
    @Transactional(readOnly = true)
    @Override
    public Boolean existRefresh(String refreshToken) {
        return refreshRepository.existsByRefresh(refreshToken);
    }

    // JWT Refresh 토큰 삭제 메소드
    @Transactional
    @Override
    public void removeRefresh(String refreshToken) {
        int deleted = refreshRepository.deleteByRefresh(refreshToken);
        if (deleted == 0) {
            log.warn("DB에 존재하지 않는 refreshToken 삭제 시도. 이미 삭제되었거나 DB가 초기화되었을 가능성이 있습니다.");
        }
    }

    // 특정 유저 Refresh 토큰 모두 삭제 (탈퇴)
    @Override
    public void removeRefreshUser(String username) {
        refreshRepository.deleteByUsername(username);
    }
}
