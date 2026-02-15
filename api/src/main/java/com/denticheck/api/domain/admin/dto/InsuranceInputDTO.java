package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class InsuranceInputDTO {
    private String category;
    private String name;
    private int price;
    private String company;
}
