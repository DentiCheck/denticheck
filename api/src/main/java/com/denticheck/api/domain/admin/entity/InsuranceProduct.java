/** [관리자 기능] 관리자 제휴 보험 상품 엔티티 */
package com.denticheck.api.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "insurance_products")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class InsuranceProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int price;

    private String company;

    @Column(name = "is_partner", nullable = false)
    @Builder.Default
    private boolean isPartner = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String category, String name, int price, String company) {
        this.category = category;
        this.name = name;
        this.price = price;
        this.company = company;
    }

    public void updatePartnerStatus(boolean isPartner) {
        this.isPartner = isPartner;
    }
}
