package com.denticheck.api.domain.dental.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "dentals")
public class DentalEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Column(name = "source_key", nullable = false, unique = true, length = 100)
    private String sourceKey;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "address", nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "homepage_url", length = 500)
    private String homepageUrl;

    @Column(name = "sido_code", length = 20)
    private String sidoCode;

    @Column(name = "sigungu_code", length = 20)
    private String sigunguCode;

    @Column(name = "lat", precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(name = "lng", precision = 10, scale = 7)
    private BigDecimal lng;

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
    private BigDecimal ratingAvg = BigDecimal.ZERO;

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

    public void updateRating(int newRating, int oldRatingCount, BigDecimal oldRatingAvg) {
        // Calculate new average
        // (oldAvg * oldCount + newRating) / (oldCount + 1)
        BigDecimal total = oldRatingAvg.multiply(BigDecimal.valueOf(oldRatingCount));
        total = total.add(BigDecimal.valueOf(newRating));

        int newCount = oldRatingCount + 1;
        this.ratingCount = newCount;
        this.ratingAvg = total.divide(BigDecimal.valueOf(newCount), 2, java.math.RoundingMode.HALF_UP);
    }
}
