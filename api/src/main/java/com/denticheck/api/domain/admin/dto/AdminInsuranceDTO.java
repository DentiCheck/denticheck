/**
 * Backend DTO: AdminInsuranceDTO
 * Path: api/src/main/java/com/denticheck/api/domain/admin/dto/AdminInsuranceDTO.java
 * Description: [관리자 기능] 관리자 보험 정보 DTO
 */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminInsuranceDTO {
    private String id;
    private int displayId;
    private String category;
    private String name;
    private int price;
    private String company;
    private boolean isPartner;
}
