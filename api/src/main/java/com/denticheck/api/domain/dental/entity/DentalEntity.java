package com.denticheck.api.domain.dental.entity;

<<<<<<< HEAD
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
=======
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
>>>>>>> origin/feature/api-service
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

<<<<<<< HEAD
    @Column(name = "source", length = 50, nullable = false)
    private String source;

    @Column(name = "source_key", length = 100, nullable = false, unique = true)
    private String sourceKey;

    @Column(name = "name", length = 200, nullable = false)
=======
    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Column(name = "source_key", nullable = false, unique = true, length = 100)
    private String sourceKey;

    @Column(name = "name", nullable = false, length = 200)
>>>>>>> origin/feature/api-service
    private String name;

    @Column(name = "phone", length = 30)
    private String phone;

<<<<<<< HEAD
    @Column(name = "address", columnDefinition = "TEXT", nullable = false)
=======
    @Column(name = "address", nullable = false, columnDefinition = "TEXT")
>>>>>>> origin/feature/api-service
    private String address;

    @Column(name = "sido_code", length = 20)
    private String sidoCode;

    @Column(name = "sigungu_code", length = 20)
    private String sigunguCode;

    @Column(name = "lat", precision = 10, scale = 7)
<<<<<<< HEAD
    private java.math.BigDecimal lat;

    @Column(name = "lng", precision = 10, scale = 7)
    private java.math.BigDecimal lng;

    public Double getLatitude() {
        return lat != null ? lat.doubleValue() : null;
    }

    public Double getLongitude() {
        return lng != null ? lng.doubleValue() : null;
    }

    @Column(name = "business_status", length = 30)
    private String businessStatus;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
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

    public void updateRating(int newRating, int oldRatingCount, java.math.BigDecimal oldRatingAvg) {
        // Calculate new average
        // (oldAvg * oldCount + newRating) / (oldCount + 1)
        java.math.BigDecimal total = oldRatingAvg.multiply(java.math.BigDecimal.valueOf(oldRatingCount));
        total = total.add(java.math.BigDecimal.valueOf(newRating));

        int newCount = oldRatingCount + 1;
        this.ratingCount = newCount;
        this.ratingAvg = total.divide(java.math.BigDecimal.valueOf(newCount), 2, java.math.RoundingMode.HALF_UP);
    }
=======
    private BigDecimal lat;

    @Column(name = "lng", precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "business_status", length = 30)
    private String businessStatus;
>>>>>>> origin/feature/api-service
}
