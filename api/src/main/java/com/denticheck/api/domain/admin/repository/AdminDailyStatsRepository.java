/** [관리자 기능] 관리자 통계 레포지토리 */
package com.denticheck.api.domain.admin.repository;

import com.denticheck.api.domain.admin.entity.AdminDailyStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AdminDailyStatsRepository extends JpaRepository<AdminDailyStats, Long> {
    Optional<AdminDailyStats> findByStatsDate(LocalDate date);

    Optional<AdminDailyStats> findTopByOrderByStatsDateDesc();
}
