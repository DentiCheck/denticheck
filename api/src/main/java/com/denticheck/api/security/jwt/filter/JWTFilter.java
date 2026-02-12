package com.denticheck.api.security.jwt.filter;

import com.denticheck.api.common.util.JWTUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@RequiredArgsConstructor
@Component
public class JWTFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String contextPath = request.getContextPath() == null ? "" : request.getContextPath();
        String requestUri = request.getRequestURI() == null ? "" : request.getRequestURI();
        String path = requestUri.startsWith(contextPath) ? requestUri.substring(contextPath.length()) : requestUri;
        return path.equals("/api/ai-check") || path.startsWith("/api/ai-check/");
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
            throw new ServletException("Invalid JWT token");
        }

        // 토큰 파싱
        String accessToken = authorization.split(" ")[1];

        // TODO: 임시 토큰 처리 (테스트용)
        if ("temp_access_token_for_test".equals(accessToken)) {
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    "temp-user",
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }

        if (jwtUtil.isValid(accessToken, true)) {
            String username = jwtUtil.getUsername(accessToken);
            String role = jwtUtil.getRole(accessToken);

            List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(role));

            Authentication auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);

            filterChain.doFilter(request, response);

        } else {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"토큰 만료 또는 유효하지 않은 토큰\"}");
        }

    }

}
