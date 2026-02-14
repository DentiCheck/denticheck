package com.denticheck.api.domain.dental.entity;

import com.denticheck.api.domain.user.entity.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "dental_likes")
@IdClass(DentalLikeEntity.DentalLikeId.class)
public class DentalLikeEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "dental_id")
    private UUID dentalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dental_id", insertable = false, updatable = false)
    private DentalEntity dental;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @NoArgsConstructor
    @AllArgsConstructor
    @Getter
    @Builder
    public static class DentalLikeId implements Serializable {
        private UUID userId;
        private UUID dentalId;
    }
}
