package com.denticheck.api.security.jwt.filter;

import com.denticheck.api.common.util.JWTUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@RequiredArgsConstructor
@Component
public class JWTFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String contextPath = request.getContextPath() == null ? "" : request.getContextPath();
        String requestUri = request.getRequestURI() == null ? "" : request.getRequestURI();
        String path = requestUri.startsWith(contextPath) ? requestUri.substring(contextPath.length()) : requestUri;
        // TODO: 위 3개는 삭제 예정
        String pathCHU = request.getServletPath();
        return path.equals("/api/ai-check") || path.startsWith("/api/ai-check/") || pathCHU.startsWith("/docs/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");

        if (authorization == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authorization.startsWith("Bearer ")) {
            // throw new ServletException("유효하지 않은 JWT 토큰 형식입니다.");
            // 잘못된 헤더로 public 리소스까지 죽지 않게 패스
            filterChain.doFilter(request, response);
            return;
        }

        // 토큰 파싱
        String accessToken = authorization.substring("Bearer ".length());

        // ✅ [관리자 기능] 테스트를 위한 개발용 임시 토큰 처리
        // 프론트엔드 또는 Postman 등에서 'Authorization: Bearer admin-test-token-2026' 헤더 사용 시
        // ADMIN 권한 부여
        if ("temp_access_token_for_test".equals(accessToken) ||
                "admin-test-token-2026".equals(accessToken) ||
                "access_token_for_admin_test".equals(accessToken)) {
            log.info("Temporary Test Admin Token detected. Granting ROLE_ADMIN.");
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    "TestAdmin",
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }

        if ("access_token_for_user_test".equals(accessToken)) {
            log.info("Temporary Test User Token detected. Granting ROLE_USER.");
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    "TestUser",
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }

        if (jwtUtil.isValid(accessToken, true)) {
            String username = jwtUtil.getUsername(accessToken);
            String role = jwtUtil.getRole(accessToken);

            Authentication auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority(role)));
            SecurityContextHolder.getContext().setAuthentication(auth);

            filterChain.doFilter(request, response);
            return;
        } else {
            // response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            // response.setContentType("application/json;charset=UTF-8");
            // response.getWriter().write("{\"error\":\"토큰 만료 또는 유효하지 않은 토큰\"}");
            // ❗ 여기서 401을 직접 내려버리면 permitAll 문서도 같이 막힐 수 있음
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

}
