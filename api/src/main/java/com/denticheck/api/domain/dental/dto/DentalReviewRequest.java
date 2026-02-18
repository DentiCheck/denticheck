package com.denticheck.api.domain.dental.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DentalReviewRequest {
    private Integer rating;
    private String content;
    private List<String> tags;
}
