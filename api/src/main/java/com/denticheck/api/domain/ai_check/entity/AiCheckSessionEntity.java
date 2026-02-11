package com.denticheck.api.domain.ai_check.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import com.denticheck.api.domain.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "ai_check_sessions")
public class AiCheckSessionEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "status", nullable = false)
    private String status; // uploaded/quality_failed/analyzing/done/error

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "client_meta_json", columnDefinition = "jsonb")
    private Map<String, Object> clientMetaJson;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private AiReportEntity report;

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private AiDecisionRecordEntity decisionRecord;
}
