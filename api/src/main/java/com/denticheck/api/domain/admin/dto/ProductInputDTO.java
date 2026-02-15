package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProductInputDTO {
    private String category;
    private String name;
    private int price;
    private String manufacturer;
    private String imageUrl;
}
