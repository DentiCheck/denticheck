package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.entity.DentalLikeEntity;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class DentalLikeRepositoryIntegrationTest {

    @Autowired
    private DentalLikeRepository dentalLikeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DentalRepository dentalRepository;

    @Test
    @DisplayName("Find user's favorite dentals")
    void findFavorites() {
        // Given
        UserEntity user = UserEntity.builder()
                .username("test_user_fav")
                .nickname("Test User")
                .email("test@example.com")
                .build();
        userRepository.save(user);

        DentalEntity dental1 = DentalEntity.builder()
                .id(java.util.UUID.randomUUID())
                .name("Dental A")
                .address("Address A")
                .source("s")
                .sourceKey("k1")
                .lat(BigDecimal.ZERO)
                .lng(BigDecimal.ZERO)
                .build();
        DentalEntity dental2 = DentalEntity.builder()
                .id(java.util.UUID.randomUUID())
                .name("Dental B")
                .address("Address B")
                .source("s")
                .sourceKey("k2")
                .lat(BigDecimal.ZERO)
                .lng(BigDecimal.ZERO)
                .build();
        dentalRepository.saveAll(List.of(dental1, dental2));

        DentalLikeEntity like1 = DentalLikeEntity.builder()
                .userId(user.getId())
                .dentalId(dental1.getId())
                .build();

        // Note: dental2 is not liked

        dentalLikeRepository.saveAll(List.of(like1));

        // When
        List<DentalLikeEntity> favorites = dentalLikeRepository.findByUserId(user.getId());

        // Then
        assertThat(favorites).hasSize(1);
        assertThat(favorites.get(0).getDentalId()).isEqualTo(dental1.getId());
    }
}
