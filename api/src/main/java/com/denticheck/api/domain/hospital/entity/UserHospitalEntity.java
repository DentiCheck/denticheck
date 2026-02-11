package com.denticheck.api.domain.hospital.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import com.denticheck.api.domain.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "user_hospitals", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_hospitals_user_hospital", columnNames = { "user_id", "hospital_id" })
})
public class UserHospitalEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id", nullable = false)
    private HospitalEntity hospital;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private boolean isFavorite = false;

    @Column(name = "last_visit_date")
    private LocalDateTime lastVisitDate;
}
