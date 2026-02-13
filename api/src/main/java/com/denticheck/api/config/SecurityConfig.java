package com.denticheck.api.config;

import com.denticheck.api.common.util.JWTUtil;
import com.denticheck.api.domain.user.entity.UserRoleType;
import com.denticheck.api.security.jwt.filter.JWTFilter;
import com.denticheck.api.security.jwt.handler.RefreshTokenLogoutHandler;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final AuthenticationSuccessHandler socialSuccessHandler;

    private final JWTFilter jwtFilter;

    public SecurityConfig(
            @Qualifier("SocialSuccessHandler") AuthenticationSuccessHandler socialSuccessHandler,
            JWTFilter jwtFilter) {
        this.socialSuccessHandler = socialSuccessHandler;

        this.jwtFilter = jwtFilter;
    }

    // 권한 계층
    @Bean
    public RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.withRolePrefix("ROLE_")
                .role(UserRoleType.ADMIN.name()).implies(UserRoleType.USER.name())
                .build();
    }

    // CORS Bean (웹/모바일에서 Authorization 헤더 보내려면 중요)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:5173", // TODO: 관리자 웹 운영 도메인으로 변경
                "http://localhost:8080",
                "exp://*", // RN(Expo) 사용 시 케이스
                "http://10.0.2.2:*" // 안드로이드 에뮬레이터
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // SecurityFilterChain
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            RefreshTokenLogoutHandler refreshTokenLogoutHandler) throws Exception {
        http
                // CSRF 보안 필터 disable
                .csrf(AbstractHttpConfigurer::disable)
                // CORS 설정
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // 세션 미상요 필터 설정 (STATELESS)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 기본 Form 기반 인증 필터들 disable
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // 기본 로그아웃 필터 + 커스텀 Refresh 토큰 삭제 핸들러 추가
                .logout(logout -> logout
                        .addLogoutHandler(refreshTokenLogoutHandler))
                // OAuth2 인증용
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(socialSuccessHandler)
                        // application-oauth.yml의 redirect-uri와 일치시켜야 함
                        .redirectionEndpoint(endpoint -> endpoint.baseUri("/oauth2/callback/*")))
                // 인가
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/oauth2/**", "/oauth2/callback/**").permitAll()
                        .requestMatchers("/auth/mobile/google").permitAll() // 모바일 네이티브 로그인
                        .requestMatchers("/jwt/exchange", "/jwt/refresh").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll() // REST 문서 기본 경로(springdoc)
                        .requestMatchers("/docs/api-docs/**", "/docs/swagger-ui/**").permitAll() // REST 문서 (springdoc)
                        .requestMatchers("/docs/graphql", "/docs/graphql/", "/docs/graphql/**").permitAll() // GraphQL 문서 (Magidoc)
                        .requestMatchers("/graphql").hasRole(UserRoleType.USER.name())
                        .requestMatchers("/admin/**").hasRole(UserRoleType.ADMIN.name())
                        .anyRequest().authenticated())
                // 예외 처리
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED); // 401 응답
                        })
                        .accessDeniedHandler((request, response, authException) -> {
                            response.sendError(HttpServletResponse.SC_FORBIDDEN); // 403 응답
                        }))
                // 커스텀 필터 추가
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // 비밀번호 단방향(BCrypt) 암호화용 Bean
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public RefreshTokenLogoutHandler refreshTokenLogoutHandler(JwtServiceImpl jwtServiceImpl, JWTUtil jwtUtil) {
        return new RefreshTokenLogoutHandler(jwtServiceImpl, jwtUtil);
    }

    @Bean
    public FilterRegistrationBean<JWTFilter> jwtFilterRegistration(JWTFilter filter) {
        var reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false); // ✅ 서블릿 컨테이너 자동 등록 OFF
        return reg;
    }
}
