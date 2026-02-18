package com.denticheck.api.common;

import com.denticheck.api.domain.admin.entity.PartnerProduct;
import com.denticheck.api.domain.admin.entity.InsuranceProduct;
import com.denticheck.api.domain.admin.repository.PartnerProductRepository;
import com.denticheck.api.domain.admin.repository.InsuranceProductRepository;
import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.user.entity.RoleEntity;
import com.denticheck.api.domain.user.entity.SocialProviderType;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.entity.UserStatusType;
import com.denticheck.api.domain.user.repository.RoleRepository;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DataInitializer.class);

        private final DentalRepository dentalRepository;
        private final PartnerProductRepository partnerProductRepository;
        private final InsuranceProductRepository insuranceProductRepository;
        private final UserRepository userRepository;
        private final RoleRepository roleRepository;

        @Override
        @Transactional
        public void run(String... args) throws Exception {
                if (dentalRepository.count() == 0) {
                        log.info("Initializing Dental Data...");
                        dentalRepository.saveAll(Arrays.asList(
                                        DentalEntity.builder()
                                                        .id(UUID.randomUUID())
                                                        .source("SEED").sourceKey("SEED_1")
                                                        .name("서울중앙치과의원").address("서울특별시 중구 세종대로 110")
                                                        .phone("02-123-4567")
                                                        .lat(BigDecimal.valueOf(37.5665))
                                                        .lng(BigDecimal.valueOf(126.9780))
                                                        .isAffiliate(true).build(),
                                        DentalEntity.builder()
                                                        .id(UUID.randomUUID())
                                                        .source("SEED").sourceKey("SEED_2")
                                                        .name("강남바른치과").address("서울특별시 강남구 테헤란로 123")
                                                        .phone("02-555-7777")
                                                        .lat(BigDecimal.valueOf(37.5665))
                                                        .lng(BigDecimal.valueOf(126.9780))
                                                        .isAffiliate(true).build(),
                                        DentalEntity.builder()
                                                        .id(UUID.randomUUID())
                                                        .source("SEED").sourceKey("SEED_3")
                                                        .name("부산해운대치과").address("부산광역시 해운대구 우동 456")
                                                        .phone("051-789-0000")
                                                        .lat(BigDecimal.valueOf(35.1587))
                                                        .lng(BigDecimal.valueOf(129.1604))
                                                        .isAffiliate(true).build(),
                                        DentalEntity.builder()
                                                        .id(UUID.randomUUID())
                                                        .source("SEED").sourceKey("SEED_4")
                                                        .name("대구시티치과").address("대구광역시 중구 공평로 789")
                                                        .phone("053-111-2222")
                                                        .lat(BigDecimal.valueOf(35.8714))
                                                        .lng(BigDecimal.valueOf(128.6014))
                                                        .isAffiliate(true).build()));
                }

                if (partnerProductRepository.count() == 0) {
                        log.info("Initializing Partner Product Data...");
                        partnerProductRepository.saveAll(Arrays.asList(
                                        PartnerProduct.builder().category("칫솔류").name("전동칫솔 9000 Pro").price(120000)
                                                        .manufacturer("오랄-C")
                                                        .imageUrl("https://dummyimage.com/300x300/e2e8f0/64748b&text=Oral-C")
                                                        .build(),
                                        PartnerProduct.builder().category("치약 및 세정제").name("불소 1450ppm 고함량 치약")
                                                        .price(8500)
                                                        .manufacturer("메디케어")
                                                        .imageUrl("https://dummyimage.com/300x300/e2e8f0/64748b&text=Toothpaste")
                                                        .build(),
                                        PartnerProduct.builder().category("구강용품").name("치간칫솔 SSS 믹스").price(4500)
                                                        .manufacturer("자이덴")
                                                        .imageUrl("https://dummyimage.com/300x300/e2e8f0/64748b&text=Interdental")
                                                        .build()));
                }

                if (insuranceProductRepository.count() == 0) {
                        log.info("Initializing Insurance Product Data...");
                        insuranceProductRepository.saveAll(Arrays.asList(
                                        InsuranceProduct.builder().category("치아보험").name("든든한 치아보장보험").price(25000)
                                                        .company("A+화재").build(),
                                        InsuranceProduct.builder().category("종합보험").name("우리아이 첫치아보험").price(18000)
                                                        .company("C-보험")
                                                        .build()));
                }

                if (roleRepository.count() == 0) {
                        log.info("Initializing Role Data...");
                        roleRepository.saveAll(Arrays.asList(
                                        RoleEntity.builder().name("ROLE_USER").build(),
                                        RoleEntity.builder().name("ROLE_ADMIN").build()));
                }

                if (userRepository.count() == 0) {
                        log.info("Initializing User Data...");
                        RoleEntity userRole = roleRepository.findByName("ROLE_USER").orElseThrow();
                        RoleEntity adminRole = roleRepository.findByName("ROLE_ADMIN").orElseThrow();
                        log.debug("userRole data = {}", userRole);
                        log.debug("adminRole data = {}", adminRole);

                        // Create admin user
                        if (userRepository.findByUsername("admin").isEmpty()) {
                                userRepository.save(UserEntity.builder()
                                                .username("admin")
                                                .nickname("관리자")
                                                .email("admin@denticheck.com")
                                                .role(adminRole)
                                                .userStatusType(UserStatusType.ACTIVE)
                                                .socialProviderType(SocialProviderType.GOOGLE)
                                                .build());
                        }

                        // Create test admin user for Dev Login
                        if (userRepository.findByUsername("admin_test").isEmpty()) {
                                userRepository.save(UserEntity.builder()
                                                .username("admin_test")
                                                .nickname("테스트관리자")
                                                .email("test-admin@denticheck.com")
                                                .role(adminRole)
                                                .userStatusType(UserStatusType.ACTIVE)
                                                .socialProviderType(SocialProviderType.GOOGLE) // Dummy provider
                                                .build());
                        }

                        // Create other users
                        if (userRepository.findByUsername("user1").isEmpty()) {
                                userRepository.saveAll(Arrays.asList(
                                                UserEntity.builder()
                                                                .username("user1")
                                                                .nickname("홍길동")
                                                                .email("hong@example.com")
                                                                .role(userRole)
                                                                .userStatusType(UserStatusType.ACTIVE)
                                                                .socialProviderType(SocialProviderType.NAVER)
                                                                .build(),
                                                UserEntity.builder()
                                                                .username("user2")
                                                                .nickname("김철수")
                                                                .email("chulsu@example.com")
                                                                .role(userRole)
                                                                .userStatusType(UserStatusType.SUSPENDED)
                                                                .socialProviderType(SocialProviderType.GOOGLE)
                                                                .build(),
                                                UserEntity.builder()
                                                                .username("user3")
                                                                .nickname("이영희")
                                                                .email("young@example.com")
                                                                .role(userRole)
                                                                .userStatusType(UserStatusType.WITHDRAWN)
                                                                .socialProviderType(SocialProviderType.APPLE)
                                                                .build()));
                        }
                }

                // Create test admin user for Dev Login (Always check, regardless of count)
                if (userRepository.findByUsername("admin_test").isEmpty()) {
                        RoleEntity adminRole = roleRepository.findByName("ROLE_ADMIN").orElseThrow();
                        userRepository.save(UserEntity.builder()
                                        .username("admin_test")
                                        .nickname("테스트관리자")
                                        .email("test-admin@denticheck.com")
                                        .role(adminRole)
                                        .userStatusType(UserStatusType.ACTIVE)
                                        .socialProviderType(SocialProviderType.GOOGLE) // Dummy provider
                                        .build());
                }
        }
}
