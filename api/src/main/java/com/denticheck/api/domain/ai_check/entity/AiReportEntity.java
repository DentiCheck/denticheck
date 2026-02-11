package com.denticheck.api.domain.ai_check.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "ai_reports")
public class AiReportEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private AiCheckSessionEntity session;

    @Column(name = "summary", nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "details", nullable = false, columnDefinition = "TEXT")
    private String details;

    @Column(name = "disclaimer", nullable = false, columnDefinition = "TEXT")
    private String disclaimer;

    @Column(name = "language", length = 10)
    @Builder.Default
    private String language = "ko";

    @Column(name = "disclaimer_version", length = 30)
    private String disclaimerVersion;
}
