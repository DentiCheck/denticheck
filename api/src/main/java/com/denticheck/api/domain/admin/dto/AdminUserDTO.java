/** [관리자 기능] 관리자 사용자 정보 DTO */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminUserDTO {
    private String id;
    private int displayId;
    private String nickname;
    private String email;
    private String role;
    private String status;
    private String createdAt;
}
