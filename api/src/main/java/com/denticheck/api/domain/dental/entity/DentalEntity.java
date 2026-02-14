package com.denticheck.api.domain.dental.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "dentals")
public class DentalEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "source", length = 50, nullable = false)
    private String source;

    @Column(name = "source_key", length = 100, nullable = false, unique = true)
    private String sourceKey;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT", nullable = false)
    private String address;

    @Column(name = "sido_code", length = 20)
    private String sidoCode;

    @Column(name = "sigungu_code", length = 20)
    private String sigunguCode;

    @Column(name = "lat")
    private java.math.BigDecimal lat;

    @Column(name = "lng")
    private java.math.BigDecimal lng;

    @Column(name = "business_status", length = 30)
    private String businessStatus;

    @Column(name = "rating_avg", nullable = false)
    @Builder.Default
    private java.math.BigDecimal ratingAvg = java.math.BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "is_affiliate", nullable = false)
    @Builder.Default
    private Boolean isAffiliate = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;
}
