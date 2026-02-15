package com.denticheck.api.domain.hospital.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "hospitals")
public class HospitalEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "address")
    private String address;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "homepage_url", length = 500)
    private String homepageUrl;

    @Column(name = "is_partner", nullable = false)
    @Builder.Default
    private boolean isPartner = true;

    public void update(String name, String address, String phone, String description, Double latitude, Double longitude,
            String homepageUrl) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
        this.homepageUrl = homepageUrl;
    }

    public void updatePartnerStatus(boolean isPartner) {
        this.isPartner = isPartner;
    }
}
