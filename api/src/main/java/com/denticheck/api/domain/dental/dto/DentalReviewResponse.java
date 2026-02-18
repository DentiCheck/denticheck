package com.denticheck.api.domain.dental.dto;

import com.denticheck.api.domain.dental.entity.DentalReviewEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DentalReviewResponse {
    private UUID id;
    private UUID dentalId;
    private UUID userId;
    private String username;
    private Integer rating;
    private String content;
    private List<String> tags;
    private ZonedDateTime createdAt;

    public static DentalReviewResponse from(DentalReviewEntity entity, ObjectMapper objectMapper) {
        List<String> tags = Collections.emptyList();
        if (entity.getTagsJson() != null && !entity.getTagsJson().isEmpty()) {
            try {
                tags = objectMapper.readValue(entity.getTagsJson(), new TypeReference<List<String>>() {
                });
            } catch (Exception e) {
                // ignore
            }
        }

        return DentalReviewResponse.builder()
                .id(entity.getId())
                .dentalId(entity.getDental().getId())
                .userId(entity.getUser().getId())
                .username(entity.getUser().getUsername())
                .rating((int) entity.getRating())
                .content(entity.getContent())
                .tags(tags)
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
