package com.denticheck.api.domain.dental.controller;

import com.denticheck.api.domain.dental.dto.DentalReviewRequest;
import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.entity.DentalReviewEntity;
import com.denticheck.api.domain.dental.service.DentalService;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(DentalReviewController.class)
public class DentalReviewControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private DentalService dentalService;

        @Autowired
        private ObjectMapper objectMapper;

        @Test
        @WithMockUser
        public void getReviews_ShouldReturnReviewList() throws Exception {
                UUID dentalId = UUID.randomUUID();
                DentalReviewEntity review = DentalReviewEntity.builder()
                                .id(UUID.randomUUID())
                                .dental(DentalEntity.builder().id(dentalId).build())
                                .user(UserEntity.builder().id(UUID.randomUUID()).username("testuser").build())
                                .rating(5)
                                .content("Great service")
                                .createdAt(ZonedDateTime.now())
                                .tagsJson("[\"kind\", \"clean\"]")
                                .build();

                given(dentalService.getReviews(dentalId)).willReturn(Collections.singletonList(review));

                mockMvc.perform(get("/api/v1/dentals/{dentalId}/reviews", dentalId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].rating").value(5))
                                .andExpect(jsonPath("$[0].content").value("Great service"));
        }

        @Test
        @WithMockUser(username = "testuser")
        public void createReview_ShouldReturnCreatedReview() throws Exception {
                UUID dentalId = UUID.randomUUID();
                DentalReviewRequest request = new DentalReviewRequest(5, "Excellent!", Arrays.asList("fast", "good"));

                DentalReviewEntity createdReview = DentalReviewEntity.builder()
                                .id(UUID.randomUUID())
                                .dental(DentalEntity.builder().id(dentalId).build())
                                .user(UserEntity.builder().id(UUID.randomUUID()).username("testuser").build())
                                .rating((short) 5)
                                .content("Excellent!")
                                .tagsJson("[\"fast\", \"good\"]")
                                .createdAt(ZonedDateTime.now())
                                .build();

                given(dentalService.createReview(eq(dentalId), eq("testuser"), eq(5), eq("Excellent!"), any()))
                                .willReturn(createdReview);

                mockMvc.perform(post("/api/v1/dentals/{dentalId}/reviews", dentalId)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.rating").value(5))
                                .andExpect(jsonPath("$.content").value("Excellent!"));
        }
}
