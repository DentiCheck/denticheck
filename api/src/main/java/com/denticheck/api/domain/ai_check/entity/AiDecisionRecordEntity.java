package com.denticheck.api.domain.ai_check.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
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
@Table(name = "ai_decision_records")
public class AiDecisionRecordEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private AiCheckSessionEntity session;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "decision_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> decisionJson; // YOLO, ML, Survey, Overall

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_versions", columnDefinition = "jsonb")
    private Map<String, Object> modelVersions;
}
