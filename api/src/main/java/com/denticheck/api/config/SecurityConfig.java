package com.denticheck.api.config;

import com.denticheck.api.domain.user.entity.UserRoleType;
import com.denticheck.api.security.jwt.filter.JWTFilter;
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
import org.springframework.http.HttpMethod;

import java.util.List;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final AuthenticationSuccessHandler socialSuccessHandler;

    public SecurityConfig(
            @Qualifier("SocialSuccessHandler") AuthenticationSuccessHandler socialSuccessHandler) {
        this.socialSuccessHandler = socialSuccessHandler;
    }

    @Bean
    public RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.withRolePrefix("ROLE_")
                .role(UserRoleType.ADMIN.name()).implies(UserRoleType.USER.name())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "http://localhost:8080",
                "exp://*",
                "http://10.0.2.2:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JWTFilter jwtFilter) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(socialSuccessHandler)
                        .redirectionEndpoint(endpoint -> endpoint.baseUri("/oauth2/callback/*")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/reports/**", "/uploads/**").permitAll()
                        .requestMatchers("/oauth2/**", "/oauth2/callback/**").permitAll()
                        .requestMatchers("/auth/mobile/google").permitAll()
                        .requestMatchers("/api/ai-check", "/api/ai-check/**").permitAll()
                        .requestMatchers("/api/v1/data/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/dentals/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/dentals/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/dentals/**").permitAll()
                        .requestMatchers("/jwt/exchange", "/jwt/refresh", "/jwt/logout", "/jwt/dev-login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll() // REST 문서 기본 경로(springdoc)
                        .requestMatchers("/docs/api-docs/**", "/docs/swagger-ui/**").permitAll() // REST 문서 (springdoc)
                        .requestMatchers("/docs/graphql", "/docs/graphql/", "/docs/graphql/**").permitAll() // GraphQL
                                                                                                            // 문서
                                                                                                            // (Magidoc)
                        .requestMatchers("/community/post/**").permitAll() // 공유 링크용 리다이렉트 (앱 딥링크로 이동)
                        .requestMatchers("/graphql").hasRole(UserRoleType.USER.name())
                        .requestMatchers("/admin/**").hasRole(UserRoleType.ADMIN.name())
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((request, response, authException) -> {
                            log.warn("Unauthorized request: {} - Path: {}", authException.getMessage(),
                                    request.getRequestURI());
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                        })
                        .accessDeniedHandler((request, response, authException) -> {
                            log.error("Access Denied: {} - Path: {}", authException.getMessage(),
                                    request.getRequestURI(), authException);
                            response.sendError(HttpServletResponse.SC_FORBIDDEN);
                        }))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public FilterRegistrationBean<JWTFilter> jwtFilterRegistration(JWTFilter filter) {
        var reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false); // ✅ 서블릿 컨테이너 자동 등록 OFF
        return reg;
    }
}
