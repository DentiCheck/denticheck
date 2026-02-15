package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class HospitalInputDTO {
    private String name;
    private String address;
    private String phone;
    private String description;
    private Double latitude;
    private Double longitude;
    private String homepageUrl;
}
