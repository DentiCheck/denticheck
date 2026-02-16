package com.denticheck.api.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MagidocCleanUrlFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getServletPath();

        // /docs/graphql 이하의 "확장자 없는" 페이지 요청만 .html로 forward
        boolean isDocs = path.startsWith("/docs/graphql/");
        boolean isAsset = path.startsWith("/docs/graphql/_app/") || path.contains(".");
        boolean isDirectory = path.endsWith("/");

        if ("GET".equals(request.getMethod()) && isDocs && !isAsset && !isDirectory) {
            // 예: /docs/graphql/introduction/welcome ->
            // /docs/graphql/introduction/welcome.html
            request.getRequestDispatcher(path + ".html").forward(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }
}