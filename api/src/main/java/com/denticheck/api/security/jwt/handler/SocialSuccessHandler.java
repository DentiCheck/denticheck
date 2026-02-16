package com.denticheck.api.security.jwt.handler;

import com.denticheck.api.common.util.JWTUtil;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@Component
@Qualifier("SocialSuccessHandler")
@RequiredArgsConstructor
public class SocialSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtServiceImpl jwtServiceImpl;
    private final JWTUtil jwtUtil;

    @Value("${admin.web.login-success-redirect}")
    private String adminLoginSuccessRedirect;

    @Value("${admin.web.refresh-cookie-max-age}")
    private Duration refreshCookieMaxAge;

    @Value("${admin.web.refresh-cookie-secure}")
    private boolean refreshCookieSecure;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {

        log.info("Social Login Success! username: {}, refreshCookieSecure config: {}", authentication.getName(),
                refreshCookieSecure);

        // username, role
        String username = authentication.getName();
        String role = authentication.getAuthorities().iterator().next().getAuthority();

        // JWT(Refresh) 발급
        String refreshToken = jwtUtil.createRefreshJWT(username, role);
        // 발급한 Refresh DB 테이블 저장 (Refresh whitelist)
        jwtServiceImpl.addRefresh(username, refreshToken);

        // 응답 쿠키 생성 (ResponseCookie 사용으로 유연하게 설정)
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path("/")
                .maxAge(refreshCookieMaxAge.getSeconds())
                .sameSite(refreshCookieSecure ? "None" : "Lax") // Secure가 true일 때만 None 가능
                .build();

        response.addHeader("Set-Cookie", cookie.toString());

        response.sendRedirect(adminLoginSuccessRedirect);
    }
}
