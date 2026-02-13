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
        String path = request.getServletPath();
        return path.startsWith("/docs/");
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
            // throw new ServletException("?좏슚?섏? ?딆? JWT ?좏겙 ?뺤떇?낅땲??");
            // ?섎せ???ㅻ뜑濡?public 由ъ냼?ㅺ퉴吏 二쎌? ?딄쾶 ?⑥뒪
            filterChain.doFilter(request, response);
            return;
        }

        // ?좏겙 ?뚯떛
        String accessToken = authorization.substring("Bearer ".length());

        // TODO: ?꾩떆 ?좏겙 泥섎━ (?뚯뒪?몄슜)
        if ("temp_access_token_for_test".equals(accessToken)) {
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
        } else {
            // response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            // response.setContentType("application/json;charset=UTF-8");
            // response.getWriter().write("{\"error\":\"?좏겙 留뚮즺 ?먮뒗 ?좏슚?섏? ?딆? ?좏겙\"}");
            // ???ш린??401??吏곸젒 ?대젮踰꾨━硫?permitAll 臾몄꽌??媛숈씠 留됲옄 ???덉쓬
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

}
