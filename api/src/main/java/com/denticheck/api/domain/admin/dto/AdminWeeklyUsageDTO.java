/** [관리자 기능] 관리자 주간 이용량 DTO */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminWeeklyUsageDTO {
    private String label;
    private int count;
}
