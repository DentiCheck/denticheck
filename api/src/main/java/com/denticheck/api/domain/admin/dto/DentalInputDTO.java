package com.denticheck.api.domain.admin.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DentalInputDTO {
    private String name;
    private String address;
    private String phone;
    private String description;
    private Double latitude;
    private Double longitude;
    private String homepageUrl;
}
