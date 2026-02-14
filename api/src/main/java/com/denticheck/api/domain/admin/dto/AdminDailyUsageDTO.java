/** [관리자 기능] 관리자 일별 이용량 DTO */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminDailyUsageDTO {
    private String label;
    private String date;
    private int count;
}
