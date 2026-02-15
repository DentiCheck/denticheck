/** [관리자 기능] 관리자 문의 DTO */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminInquiryDTO {
    private String id;
    private int displayId;
    private String userName;
    private String dentistName;
    private String title;
    private String date;
    private String status;
}
