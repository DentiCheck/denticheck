/** [관리자 기능] 관리자 대시보드 통계 DTO */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;

@Getter
@Builder
public class AdminDashboardStatsDTO {
    private int totalUsers;
    private BigDecimal userTrend;
    private int totalDentists;
    private int dentistTrend;
    private int newInquiries;
    private int inquiryTrend;
    private int weeklyUsage;
    private int weeklyTrend;
}
