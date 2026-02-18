package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalEntity;
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
class DentalRepositoryIntegrationTest {

        @Autowired
        private DentalRepository dentalRepository;

        @Test
        @DisplayName("Find dentals nearby Seoul Station")
        void findNearbyDentals() {
                // Given: Seoul Station (37.5547, 126.9707) as center
                double seoulStationLat = 37.5547;
                double seoulStationLon = 126.9707;

                // 1. Dental at City Hall (Very close, approx 0.8km)
                DentalEntity cityHallDental = DentalEntity.builder()
                                .id(java.util.UUID.randomUUID())
                                .name("City Hall Dental")
                                .address("City Hall Address")
                                .source("source")
                                .sourceKey("key1")
                                .lat(BigDecimal.valueOf(37.5663)) // Approx
                                .lng(BigDecimal.valueOf(126.9779))
                                .build();

                // 2. Dental at Gangnam (Far, approx 8-9km)
                DentalEntity gangnamDental = DentalEntity.builder()
                                .id(java.util.UUID.randomUUID())
                                .name("Gangnam Dental")
                                .address("Gangnam Address")
                                .source("source")
                                .sourceKey("key2")
                                .lat(BigDecimal.valueOf(37.4979))
                                .lng(BigDecimal.valueOf(127.0276))
                                .build();

                // 3. Dental at Busan (Very Far, approx 300km+)
                DentalEntity busanDental = DentalEntity.builder()
                                .id(java.util.UUID.randomUUID())
                                .name("Busan Dental")
                                .address("Busan Address")
                                .source("source")
                                .sourceKey("key3")
                                .lat(BigDecimal.valueOf(35.1796))
                                .lng(BigDecimal.valueOf(129.0756))
                                .build();

                dentalRepository.saveAll(List.of(cityHallDental, gangnamDental, busanDental));

                // When: Search within 5km radius
                double radius = 5.0;
                double latChange = radius / 111.32;
                double lngChange = radius / (111.32 * Math.cos(Math.toRadians(seoulStationLat)));
                org.springframework.data.domain.Page<DentalEntity> nearbyDentalsPage = dentalRepository
                                .findNearbyDentals(seoulStationLat, seoulStationLon,
                                                radius,
                                                seoulStationLat - latChange, seoulStationLat + latChange,
                                                seoulStationLon - lngChange, seoulStationLon + lngChange,
                                                org.springframework.data.domain.PageRequest.of(0, 10));
                List<DentalEntity> nearbyDentals = nearbyDentalsPage.getContent();

                // Then
                assertThat(nearbyDentals).hasSize(1);
                assertThat(nearbyDentals.get(0).getName()).isEqualTo("City Hall Dental");

                // When: Search within 15km radius
                radius = 15.0;
                latChange = radius / 111.32;
                lngChange = radius / (111.32 * Math.cos(Math.toRadians(seoulStationLat)));

                org.springframework.data.domain.Page<DentalEntity> withinRegionPage = dentalRepository
                                .findNearbyDentals(seoulStationLat, seoulStationLon,
                                                radius,
                                                seoulStationLat - latChange, seoulStationLat + latChange,
                                                seoulStationLon - lngChange, seoulStationLon + lngChange,
                                                org.springframework.data.domain.PageRequest.of(0, 10));

                List<DentalEntity> withinRegion = withinRegionPage.getContent();

                // Then
                assertThat(withinRegion).hasSize(2);
                // Sorted by distance: City Hall (closer) -> Gangnam (further)
                // Note: Sort order depends on query implementation, usually closest first
                assertThat(withinRegion.get(0).getName()).isEqualTo("City Hall Dental");
                assertThat(withinRegion.get(1).getName()).isEqualTo("Gangnam Dental");
        }
}
