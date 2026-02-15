/**
 * Backend DTO: AdminDentistDTO
 * Path: api/src/main/java/com/denticheck/api/domain/admin/dto/AdminDentistDTO.java
 * Description: [관리자 기능] 관리자 치과 정보 DTO
 */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminDentistDTO {
    private String id;
    private int displayId;
    private String name;
    private String address;
    private String phone;
    private boolean isPartner;
}
