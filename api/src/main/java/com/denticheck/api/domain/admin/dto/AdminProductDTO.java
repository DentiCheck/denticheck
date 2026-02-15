/**
 * Backend DTO: AdminProductDTO
 * Path: api/src/main/java/com/denticheck/api/domain/admin/dto/AdminProductDTO.java
 * Description: [관리자 기능] 관리자 상품 정보 DTO
 */
package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminProductDTO {
    private String id;
    private int displayId;
    private String category;
    private String name;
    private int price;
    private String manufacturer;
    private String imageUrl;
    private boolean isPartner;
}
