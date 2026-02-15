/** [관리자 기능] 관리자 통계 엔티티 */
package com.denticheck.api.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_daily_stats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AdminDailyStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stats_date", nullable = false, unique = true)
    private LocalDate statsDate;

    @Column(name = "total_users", nullable = false)
    private int totalUsers;

    @Column(name = "total_dentists", nullable = false)
    private int totalDentists;

    @Column(name = "new_inquiries", nullable = false)
    private int newInquiries;

    @Column(name = "weekly_usage", nullable = false)
    private int weeklyUsage;

    @Column(name = "user_trend")
    private BigDecimal userTrend;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
