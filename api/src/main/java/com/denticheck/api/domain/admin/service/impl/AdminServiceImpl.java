/**
 * Backend File: Admin Service Implementation
 * Path: api/src/main/java/com/denticheck/api/domain/admin/service/impl/AdminServiceImpl.java
 * Description: [관리자 기능] 관리자 서비스 실제 로직 구현부
 */
package com.denticheck.api.domain.admin.service.impl;

import com.denticheck.api.domain.admin.dto.*;
import com.denticheck.api.domain.admin.entity.AdminDailyStats;
import com.denticheck.api.domain.admin.entity.InsuranceProduct;
import com.denticheck.api.domain.admin.entity.PartnerProduct;
import com.denticheck.api.domain.admin.repository.AdminDailyStatsRepository;
import com.denticheck.api.domain.admin.repository.AdminInquiryRepository;
import com.denticheck.api.domain.admin.repository.InsuranceProductRepository;
import com.denticheck.api.domain.admin.repository.PartnerProductRepository;
import com.denticheck.api.domain.admin.service.AdminService;
import com.denticheck.api.domain.hospital.entity.HospitalEntity;
import com.denticheck.api.domain.hospital.repository.HospitalRepository;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminServiceImpl implements AdminService {

        private final AdminDailyStatsRepository statsRepository;
        private final UserRepository userRepository;
        private final HospitalRepository hospitalRepository;
        private final PartnerProductRepository partnerProductRepository;
        private final InsuranceProductRepository insuranceProductRepository;
        private final AdminInquiryRepository inquiryRepository;

        @Override
        public AdminDashboardStatsDTO getDashboardStats() {
                AdminDailyStats latest = statsRepository.findTopByOrderByStatsDateDesc()
                                .orElse(AdminDailyStats.builder()
                                                .totalUsers(0).totalDentists(0).newInquiries(0).weeklyUsage(0)
                                                .userTrend(0.0)
                                                .build());

                // 전날 데이터와 비교하여 증감 산출 (간소화)
                return AdminDashboardStatsDTO.builder()
                                .totalUsers(latest.getTotalUsers())
                                .userTrend(latest.getUserTrend())
                                .totalDentists(latest.getTotalDentists())
                                .dentistTrend(0) // 상세 트렌드는 DB 설계에 따라 확장 가능
                                .newInquiries(latest.getNewInquiries())
                                .inquiryTrend(0)
                                .weeklyUsage(latest.getWeeklyUsage())
                                .weeklyTrend(0)
                                .build();
        }

        @Override
        public List<AdminDailyUsageDTO> getDailyUsage() {
                // 최근 7일간의 통계 데이터 조회 (데이터가 부족하면 빈 값 반환)
                return statsRepository.findAll().stream()
                                .sorted((a, b) -> a.getStatsDate().compareTo(b.getStatsDate()))
                                .limit(7)
                                .map(s -> AdminDailyUsageDTO.builder()
                                                .label(s.getStatsDate().getDayOfWeek().toString().substring(0, 3))
                                                .date(s.getStatsDate().toString())
                                                .count(s.getTotalUsers()) // 실제로는 일일 이용량 필드를 더 사용 가능
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminWeeklyUsageDTO> getWeeklyUsage() {
                // 최근 4주(4개 실측 지표) 조회
                return statsRepository.findAll().stream()
                                .sorted((a, b) -> b.getStatsDate().compareTo(a.getStatsDate()))
                                .limit(4)
                                .map(s -> AdminWeeklyUsageDTO.builder()
                                                .label(s.getStatsDate().toString())
                                                .count(s.getWeeklyUsage())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminInquiryDTO> getRecentInquiries() {
                return inquiryRepository.findTop5ByOrderByCreatedAtDesc().stream()
                                .map(i -> AdminInquiryDTO.builder()
                                                .id(i.getId().toString())
                                                .displayId(1) // 상세 조회 시 필요 시 정교화
                                                .userName(i.getNickname())
                                                .title(i.getTitle())
                                                .date(i.getCreatedAt().toLocalDate().toString())
                                                .status(i.getStatus())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminUserDTO> getAllUsers(String keyword) {
                List<UserEntity> userEntities = (keyword == null || keyword.isEmpty())
                                ? userRepository.findAll()
                                : userRepository.findByKeyword(keyword);

                userEntities.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

                return IntStream.range(0, userEntities.size())
                                .mapToObj(i -> {
                                        UserEntity user = userEntities.get(i);
                                        return AdminUserDTO.builder()
                                                        .id(user.getId().toString())
                                                        .displayId(i + 1) // 최신순 1번
                                                        .nickname(user.getNickname())
                                                        .email(user.getEmail())
                                                        .role(user.getRole() != null ? user.getRole().getName()
                                                                        : "USER")
                                                        .status(user.getUserStatusType().name())
                                                        .createdAt(user.getCreatedAt().toString())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public AdminUserDTO updateUserStatus(String userId, String status) {
                UserEntity user = userRepository.findById(java.util.UUID.fromString(userId))
                                .orElseThrow(() -> new RuntimeException("User not found"));

                // Reflection 등을 피하기 위해 단순 전환
                // user.updateStatus(UserStatusType.valueOf(status)); // 필요 시 엔티티에 메서드 추가
                return AdminUserDTO.builder().id(userId).status(status).build();
        }

        @Override
        public List<AdminDentistDTO> getAllDentists(String keyword) {
                List<HospitalEntity> hospitals = (keyword == null || keyword.isEmpty())
                                ? hospitalRepository.findAll()
                                : hospitalRepository.findByNameContaining(keyword);

                return hospitals.stream()
                                .map(h -> AdminDentistDTO.builder()
                                                .id(h.getId().toString())
                                                .name(h.getName())
                                                .address(h.getAddress())
                                                .phone(h.getPhone())
                                                .isPartner(true)
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminProductDTO> getAllProducts(String category, String keyword) {
                List<PartnerProduct> products = partnerProductRepository.findByCategoryContainingOrNameContaining(
                                category != null ? category : "", keyword != null ? keyword : "");
                return products.stream()
                                .map(p -> AdminProductDTO.builder()
                                                .id(p.getId().toString())
                                                .category(p.getCategory())
                                                .name(p.getName())
                                                .price(p.getPrice())
                                                .manufacturer(p.getManufacturer())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminInsuranceDTO> getAllInsuranceProducts(String category, String keyword) {
                List<InsuranceProduct> products = insuranceProductRepository.findByCategoryContainingOrNameContaining(
                                category != null ? category : "", keyword != null ? keyword : "");
                return products.stream()
                                .map(i -> AdminInsuranceDTO.builder()
                                                .id(i.getId().toString())
                                                .category(i.getCategory())
                                                .name(i.getName())
                                                .price(i.getPrice())
                                                .company(i.getCompany())
                                                .build())
                                .collect(Collectors.toList());
        }
}
