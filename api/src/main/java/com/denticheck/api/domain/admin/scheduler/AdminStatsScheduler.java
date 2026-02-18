package com.denticheck.api.domain.admin.scheduler;

import com.denticheck.api.domain.admin.entity.AdminDailyStats;
import com.denticheck.api.domain.admin.repository.AdminDailyStatsRepository;
import com.denticheck.api.domain.admin.repository.AdminInquiryRepository;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminStatsScheduler {

    private final AdminDailyStatsRepository statsRepository;
    private final UserRepository userRepository;
    private final DentalRepository dentalRepository;
    private final AdminInquiryRepository inquiryRepository;
    private final com.denticheck.api.domain.chatbot.repository.ChatSessionRepository chatSessionRepository;

    /**
     * 매일 자정(00:00)에 실행되어 전날의 지표를 집계합니다.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void collectDailyStats() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime startOfYesterday = yesterday.atStartOfDay();
        LocalDateTime sevenDaysAgo = yesterday.minusDays(6).atStartOfDay();

        log.info("Starting daily stats collection for date: {}", yesterday);

        // 1. 핵심 지표 계산
        int totalUsers = (int) userRepository.count();
        int totalDentists = (int) dentalRepository.count();

        // 실제 데이터 집계
        int newInquiries = (int) inquiryRepository.countByCreatedAtAfter(startOfYesterday);
        int weeklyUsage = (int) chatSessionRepository.countByCreatedAtAfter(sevenDaysAgo);

        // 2. 트렌드 계산 (전일 대비 증가율)
        BigDecimal userTrend = BigDecimal.ZERO;
        AdminDailyStats prevStats = statsRepository.findByStatsDate(yesterday.minusDays(1)).orElse(null);
        if (prevStats != null && prevStats.getTotalUsers() > 0) {
            BigDecimal diff = BigDecimal.valueOf(totalUsers - prevStats.getTotalUsers());
            BigDecimal prev = BigDecimal.valueOf(prevStats.getTotalUsers());
            // (diff / prev) * 100
            userTrend = diff.divide(prev, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }

        // 3. 데이터 저장
        AdminDailyStats stats = AdminDailyStats.builder()
                .statsDate(yesterday)
                .totalUsers(totalUsers)
                .totalDentists(totalDentists)
                .newInquiries(newInquiries)
                .weeklyUsage(weeklyUsage)
                .userTrend(userTrend)
                .build();

        statsRepository.save(stats);
        log.info("Successfully saved daily stats for {}", yesterday);
    }
}
