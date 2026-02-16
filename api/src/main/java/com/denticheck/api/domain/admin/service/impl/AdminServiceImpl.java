/**
 * Backend File: Admin Service Implementation
 * Path: api/src/main/java/com/denticheck/api/domain/admin/service/impl/AdminServiceImpl.java
 */
package com.denticheck.api.domain.admin.service.impl;

import java.math.BigDecimal;
import com.denticheck.api.domain.admin.dto.*;
import com.denticheck.api.domain.admin.entity.AdminDailyStats;
import com.denticheck.api.domain.admin.entity.AdminInquiry;
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
import com.denticheck.api.domain.user.entity.UserStatusType;
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

        private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AdminServiceImpl.class);

        private final AdminDailyStatsRepository statsRepository;
        private final UserRepository userRepository;
        private final HospitalRepository hospitalRepository;
        private final PartnerProductRepository partnerProductRepository;
        private final InsuranceProductRepository insuranceProductRepository;
        private final AdminInquiryRepository inquiryRepository;

        @Override
        public AdminUserDTO getMe() {
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication().getName();
                UserEntity user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return AdminUserDTO.builder()
                                .id(user.getId().toString())
                                .displayId(0)
                                .nickname(user.getNickname())
                                .email(user.getEmail())
                                .role(user.getRole() != null ? user.getRole().getName() : "USER")
                                .status(user.getUserStatusType().name())
                                .createdAt(user.getCreatedAt().toString())
                                .build();
        }

        @Override
        public AdminDashboardStatsDTO getDashboardStats() {
                AdminDailyStats latest = statsRepository.findAll().stream()
                                .max((a, b) -> a.getStatsDate().compareTo(b.getStatsDate()))
                                .orElse(AdminDailyStats.builder()
                                                .totalUsers(0).totalDentists(0).newInquiries(0).weeklyUsage(0)
                                                .userTrend(BigDecimal.ZERO)
                                                .build());

                return AdminDashboardStatsDTO.builder()
                                .totalUsers(latest.getTotalUsers())
                                .userTrend(latest.getUserTrend())
                                .totalDentists(latest.getTotalDentists())
                                .dentistTrend(0)
                                .newInquiries(latest.getNewInquiries())
                                .inquiryTrend(0)
                                .weeklyUsage(latest.getWeeklyUsage())
                                .weeklyTrend(0)
                                .build();
        }

        @Override
        public List<AdminDailyUsageDTO> getDailyUsage() {
                return statsRepository.findAll().stream()
                                .sorted((a, b) -> a.getStatsDate().compareTo(b.getStatsDate()))
                                .limit(7)
                                .map(s -> AdminDailyUsageDTO.builder()
                                                .label(s.getStatsDate().toString())
                                                .date(s.getStatsDate().toString())
                                                .count(s.getTotalUsers())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminWeeklyUsageDTO> getWeeklyUsage() {
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
                List<AdminInquiry> inquiries = inquiryRepository.findTop5ByOrderByCreatedAtDesc();
                return IntStream.range(0, inquiries.size())
                                .mapToObj(i -> {
                                        AdminInquiry inquiry = inquiries.get(i);
                                        return AdminInquiryDTO.builder()
                                                        .id(inquiry.getId().toString())
                                                        .displayId(i + 1)
                                                        .userName(inquiry.getNickname())
                                                        .title(inquiry.getTitle())
                                                        .date(inquiry.getCreatedAt().toLocalDate().toString())
                                                        .status(inquiry.getStatus())
                                                        .build();
                                })
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
                                                        .displayId(i + 1)
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

                user.updateStatus(UserStatusType.valueOf(status));
                userRepository.saveAndFlush(user);
                return AdminUserDTO.builder()
                                .id(userId)
                                .nickname(user.getNickname())
                                .email(user.getEmail())
                                .role(user.getRole() != null ? user.getRole().getName() : "USER")
                                .status(user.getUserStatusType().name())
                                .createdAt(user.getCreatedAt().toString())
                                .build();
        }

        @Override
        public List<AdminDentistDTO> getAllDentists(String keyword, String filter) {
                log.info("Fetching dentists with keyword: {}, filter: {}", keyword, filter);
                List<HospitalEntity> hospitals;
                if (keyword == null || keyword.isEmpty()) {
                        hospitals = hospitalRepository.findAll();
                } else if ("address".equalsIgnoreCase(filter)) {
                        hospitals = hospitalRepository.findByAddressContaining(keyword);
                } else if ("name".equalsIgnoreCase(filter)) {
                        hospitals = hospitalRepository.findByNameContaining(keyword);
                } else {
                        hospitals = hospitalRepository.findByNameContainingOrAddressContaining(keyword, keyword);
                }
                hospitals.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
                final List<HospitalEntity> finalHospitals = hospitals;
                return IntStream.range(0, finalHospitals.size())
                                .mapToObj(i -> {
                                        HospitalEntity h = finalHospitals.get(i);
                                        return AdminDentistDTO.builder()
                                                        .id(h.getId().toString())
                                                        .displayId(i + 1)
                                                        .name(h.getName())
                                                        .address(h.getAddress())
                                                        .phone(h.getPhone())
                                                        .isPartner(h.isPartner())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminProductDTO> getAllProducts(final String category, final String keyword) {
                log.info("Fetching products with category: {}, keyword: {}", category, keyword);

                List<PartnerProduct> products;
                final boolean hasCategory = category != null && !category.isEmpty()
                                && !"all".equalsIgnoreCase(category);
                final boolean hasKeyword = keyword != null && !keyword.isEmpty();

                if (!hasCategory && !hasKeyword) {
                        products = partnerProductRepository.findAll();
                } else if (hasCategory && hasKeyword) {
                        products = partnerProductRepository.findByCategoryContainingOrNameContaining(category, keyword)
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category)
                                                        && p.getName().contains(keyword))
                                        .collect(Collectors.toList());
                } else if (hasCategory) {
                        products = partnerProductRepository.findByCategoryContainingOrNameContaining(category, "")
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category))
                                        .collect(Collectors.toList());
                } else {
                        products = partnerProductRepository.findByCategoryContainingOrNameContaining("", keyword);
                }
                products.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

                final List<PartnerProduct> finalProducts = products;
                return IntStream.range(0, finalProducts.size())
                                .mapToObj(i -> {
                                        PartnerProduct p = finalProducts.get(i);
                                        return AdminProductDTO.builder()
                                                        .id(p.getId().toString())
                                                        .displayId(i + 1)
                                                        .category(p.getCategory())
                                                        .name(p.getName())
                                                        .price(p.getPrice())
                                                        .manufacturer(p.getManufacturer())
                                                        .imageUrl(p.getImageUrl())
                                                        .isPartner(p.isPartner())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        public List<AdminInsuranceDTO> getAllInsuranceProducts(final String category, final String keyword) {
                log.info("Fetching insurance products with category: {}, keyword: {}", category, keyword);

                List<InsuranceProduct> products;
                final boolean hasCategory = category != null && !category.isEmpty()
                                && !"all".equalsIgnoreCase(category);
                final boolean hasKeyword = keyword != null && !keyword.isEmpty();

                if (!hasCategory && !hasKeyword) {
                        products = insuranceProductRepository.findAll();
                } else if (hasCategory && hasKeyword) {
                        products = insuranceProductRepository
                                        .findByCategoryContainingOrNameContaining(category, keyword).stream()
                                        .filter(p -> p.getCategory().contains(category)
                                                        && p.getName().contains(keyword))
                                        .collect(Collectors.toList());
                } else if (hasCategory) {
                        products = insuranceProductRepository.findByCategoryContainingOrNameContaining(category, "")
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category))
                                        .collect(Collectors.toList());
                } else {
                        products = insuranceProductRepository.findByCategoryContainingOrNameContaining("", keyword);
                }
                products.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));

                final List<InsuranceProduct> finalProducts = products;
                return IntStream.range(0, finalProducts.size())
                                .mapToObj(i -> {
                                        InsuranceProduct p = finalProducts.get(i);
                                        return AdminInsuranceDTO.builder()
                                                        .id(p.getId().toString())
                                                        .displayId(i + 1)
                                                        .category(p.getCategory())
                                                        .name(p.getName())
                                                        .price(p.getPrice())
                                                        .company(p.getCompany())
                                                        .isPartner(p.isPartner())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public AdminDentistDTO createHospital(HospitalInputDTO input) {
                HospitalEntity hospital = HospitalEntity.builder()
                                .name(input.getName())
                                .address(input.getAddress())
                                .phone(input.getPhone())
                                .description(input.getDescription())
                                .latitude(input.getLatitude())
                                .longitude(input.getLongitude())
                                .homepageUrl(input.getHomepageUrl())
                                .build();
                HospitalEntity saved = hospitalRepository.save(hospital);
                return AdminDentistDTO.builder()
                                .id(saved.getId().toString())
                                .displayId(0)
                                .name(saved.getName())
                                .address(saved.getAddress())
                                .phone(saved.getPhone())
                                .isPartner(saved.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminProductDTO createProduct(ProductInputDTO input) {
                PartnerProduct product = PartnerProduct.builder()
                                .category(input.getCategory())
                                .name(input.getName())
                                .price(input.getPrice())
                                .manufacturer(input.getManufacturer())
                                .imageUrl(input.getImageUrl())
                                .isPartner(true)
                                .build();
                PartnerProduct saved = partnerProductRepository.save(product);
                return AdminProductDTO.builder()
                                .id(saved.getId().toString())
                                .displayId(0)
                                .category(saved.getCategory())
                                .name(saved.getName())
                                .price(saved.getPrice())
                                .manufacturer(saved.getManufacturer())
                                .imageUrl(saved.getImageUrl())
                                .isPartner(saved.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminInsuranceDTO createInsurance(InsuranceInputDTO input) {
                InsuranceProduct insurance = InsuranceProduct.builder()
                                .category(input.getCategory())
                                .name(input.getName())
                                .price(input.getPrice())
                                .company(input.getCompany())
                                .isPartner(true)
                                .build();
                InsuranceProduct saved = insuranceProductRepository.save(insurance);
                return AdminInsuranceDTO.builder()
                                .id(saved.getId().toString())
                                .displayId(0)
                                .category(saved.getCategory())
                                .name(saved.getName())
                                .price(saved.getPrice())
                                .company(saved.getCompany())
                                .isPartner(saved.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminDentistDTO updateHospital(String id, HospitalInputDTO input) {
                HospitalEntity hospital = hospitalRepository.findById(java.util.UUID.fromString(id))
                                .orElseThrow(() -> new RuntimeException("Hospital not found"));
                hospital.update(input.getName(), input.getAddress(), input.getPhone(),
                                input.getDescription(), input.getLatitude(), input.getLongitude(),
                                input.getHomepageUrl());
                hospitalRepository.saveAndFlush(hospital);
                return AdminDentistDTO.builder()
                                .id(hospital.getId().toString())
                                .displayId(0)
                                .name(hospital.getName())
                                .address(hospital.getAddress())
                                .phone(hospital.getPhone())
                                .isPartner(hospital.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminProductDTO updateProduct(String id, ProductInputDTO input) {
                PartnerProduct product = partnerProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new RuntimeException("Product not found"));
                product.update(input.getCategory(), input.getName(), input.getPrice(),
                                input.getManufacturer(), input.getImageUrl());
                partnerProductRepository.saveAndFlush(product);
                return AdminProductDTO.builder()
                                .id(product.getId().toString())
                                .displayId(0)
                                .category(product.getCategory())
                                .name(product.getName())
                                .price(product.getPrice())
                                .manufacturer(product.getManufacturer())
                                .imageUrl(product.getImageUrl())
                                .isPartner(product.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminInsuranceDTO updateInsurance(String id, InsuranceInputDTO input) {
                InsuranceProduct insurance = insuranceProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new RuntimeException("Insurance not found"));
                insurance.update(input.getCategory(), input.getName(), input.getPrice(), input.getCompany());
                insuranceProductRepository.saveAndFlush(insurance);
                return AdminInsuranceDTO.builder()
                                .id(insurance.getId().toString())
                                .displayId(0)
                                .category(insurance.getCategory())
                                .name(insurance.getName())
                                .price(insurance.getPrice())
                                .company(insurance.getCompany())
                                .isPartner(insurance.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminDentistDTO updateHospitalPartnerStatus(String id, boolean isPartner) {
                HospitalEntity hospital = hospitalRepository.findById(java.util.UUID.fromString(id))
                                .orElseThrow(() -> new RuntimeException("Hospital not found"));
                hospital.updatePartnerStatus(isPartner);
                hospitalRepository.saveAndFlush(hospital);
                return AdminDentistDTO.builder()
                                .id(hospital.getId().toString())
                                .name(hospital.getName())
                                .address(hospital.getAddress())
                                .phone(hospital.getPhone())
                                .isPartner(hospital.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminProductDTO updateProductPartnerStatus(String id, boolean isPartner) {
                PartnerProduct product = partnerProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new RuntimeException("Product not found"));
                product.updatePartnerStatus(isPartner);
                partnerProductRepository.saveAndFlush(product);
                return AdminProductDTO.builder()
                                .id(product.getId().toString())
                                .category(product.getCategory())
                                .name(product.getName())
                                .price(product.getPrice())
                                .manufacturer(product.getManufacturer())
                                .imageUrl(product.getImageUrl())
                                .isPartner(product.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public AdminInsuranceDTO updateInsurancePartnerStatus(String id, boolean isPartner) {
                InsuranceProduct insurance = insuranceProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new RuntimeException("Insurance not found"));
                insurance.updatePartnerStatus(isPartner);
                insuranceProductRepository.saveAndFlush(insurance);
                return AdminInsuranceDTO.builder()
                                .id(insurance.getId().toString())
                                .category(insurance.getCategory())
                                .name(insurance.getName())
                                .price(insurance.getPrice())
                                .company(insurance.getCompany())
                                .isPartner(insurance.isPartner())
                                .build();
        }

        @Override
        @Transactional
        public boolean deleteHospital(String id) {
                try {
                        hospitalRepository.deleteById(java.util.UUID.fromString(id));
                        return true;
                } catch (Exception e) {
                        log.error("Error deleting hospital: {}", e.getMessage());
                        return false;
                }
        }

        @Override
        @Transactional
        public boolean deleteProduct(String id) {
                try {
                        partnerProductRepository.deleteById(Long.parseLong(id));
                        return true;
                } catch (Exception e) {
                        log.error("Error deleting product: {}", e.getMessage());
                        return false;
                }
        }

        @Override
        @Transactional
        public boolean deleteInsurance(String id) {
                try {
                        insuranceProductRepository.deleteById(Long.parseLong(id));
                        return true;
                } catch (Exception e) {
                        log.error("Error deleting insurance: {}", e.getMessage());
                        return false;
                }
        }
}
