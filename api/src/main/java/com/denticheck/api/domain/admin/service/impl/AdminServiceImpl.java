/**
 * Backend File: Admin Service Implementation
 * Path: api/src/main/java/com/denticheck/api/domain/admin/service/impl/AdminServiceImpl.java
 */
package com.denticheck.api.domain.admin.service.impl;

import java.math.BigDecimal;
import com.denticheck.api.domain.admin.dto.AdminDashboardStatsDTO;
import com.denticheck.api.domain.admin.dto.AdminDailyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminDentistDTO;
import com.denticheck.api.domain.admin.dto.AdminInquiryDTO;
import com.denticheck.api.domain.admin.dto.AdminProductDTO;
import com.denticheck.api.domain.admin.dto.AdminUserDTO;
import com.denticheck.api.domain.admin.dto.AdminWeeklyUsageDTO;
import com.denticheck.api.domain.admin.dto.DentalInputDTO;
import com.denticheck.api.domain.admin.dto.AdminInsuranceDTO;
import com.denticheck.api.domain.admin.dto.ProductInputDTO;
import com.denticheck.api.domain.admin.dto.InsuranceInputDTO;
import com.denticheck.api.domain.admin.entity.AdminDailyStats;
import com.denticheck.api.domain.admin.entity.AdminInquiry;
import com.denticheck.api.domain.admin.entity.InsuranceProduct;
import com.denticheck.api.domain.admin.entity.PartnerProduct;
import com.denticheck.api.domain.admin.repository.AdminDailyStatsRepository;
import com.denticheck.api.domain.admin.repository.AdminInquiryRepository;
import com.denticheck.api.domain.admin.repository.InsuranceProductRepository;
import com.denticheck.api.domain.admin.repository.PartnerProductRepository;
import com.denticheck.api.domain.admin.service.AdminService;
import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.entity.UserStatusType;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.denticheck.api.common.exception.user.UserException;
import com.denticheck.api.common.exception.user.UserErrorCode;
import com.denticheck.api.common.exception.dental.DentalException;
import com.denticheck.api.common.exception.dental.DentalErrorCode;
import com.denticheck.api.common.exception.admin.AdminException;
import com.denticheck.api.common.exception.admin.AdminErrorCode;
import com.denticheck.api.infrastructure.external.KakaoMapService;
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
        private final DentalRepository dentalRepository;
        private final PartnerProductRepository partnerProductRepository;
        private final InsuranceProductRepository insuranceProductRepository;
        private final AdminInquiryRepository inquiryRepository;
        private final KakaoMapService kakaoMapService;

        @Override
        public AdminUserDTO getMe() {
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication().getName();
                UserEntity user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

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

                userEntities.sort((a, b) -> {
                        int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                        if (cmp != 0)
                                return cmp;
                        return b.getId().compareTo(a.getId());
                });

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
                                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

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
                List<DentalEntity> dentals;
                if (keyword == null || keyword.isEmpty()) {
                        dentals = dentalRepository.findAll();
                } else if ("address".equalsIgnoreCase(filter)) {
                        dentals = dentalRepository.findByAddressContaining(keyword);
                } else if ("name".equalsIgnoreCase(filter)) {
                        dentals = dentalRepository.findByNameContaining(keyword);
                } else {
                        dentals = dentalRepository.findByNameContainingOrAddressContaining(keyword, keyword);
                }
                dentals.sort((a, b) -> {
                        if (a.getCreatedAt() == null || b.getCreatedAt() == null)
                                return 0;
                        int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                        if (cmp != 0)
                                return cmp;
                        return b.getId().compareTo(a.getId());
                });
                final List<DentalEntity> finalDentals = dentals;
                return IntStream.range(0, finalDentals.size())
                                .mapToObj(i -> {
                                        DentalEntity d = finalDentals.get(i);
                                        return AdminDentistDTO.builder()
                                                        .id(d.getId().toString())
                                                        .displayId(i + 1)
                                                        .name(d.getName())
                                                        .address(d.getAddress())
                                                        .phone(d.getPhone())
                                                        .isPartner(d.getIsAffiliate())
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
                        products = partnerProductRepository.findAllByOrderByCreatedAtDescIdDesc();
                } else if (hasCategory && hasKeyword) {
                        products = partnerProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc(category,
                                                        keyword)
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category)
                                                        && p.getName().contains(keyword))
                                        .collect(Collectors.toList());
                } else if (hasCategory) {
                        products = partnerProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc(category,
                                                        "")
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category))
                                        .collect(Collectors.toList());
                } else {
                        products = partnerProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc("",
                                                        keyword);
                }

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
                        products = insuranceProductRepository.findAllByOrderByCreatedAtDescIdDesc();
                } else if (hasCategory && hasKeyword) {
                        products = insuranceProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc(category,
                                                        keyword)
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category)
                                                        && p.getName().contains(keyword))
                                        .collect(Collectors.toList());
                } else if (hasCategory) {
                        products = insuranceProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc(category,
                                                        "")
                                        .stream()
                                        .filter(p -> p.getCategory().contains(category))
                                        .collect(Collectors.toList());
                } else {
                        products = insuranceProductRepository
                                        .findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc("",
                                                        keyword);
                }

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
        public AdminDentistDTO createDental(DentalInputDTO input) {
                DentalEntity dental = DentalEntity.builder()
                                .id(java.util.UUID.randomUUID())
                                .name(input.getName())
                                .address(input.getAddress())
                                .phone(input.getPhone())
                                .description(input.getDescription())
                                .lat(input.getLatitude() != null ? BigDecimal.valueOf(input.getLatitude()) : null)
                                .lng(input.getLongitude() != null ? BigDecimal.valueOf(input.getLongitude()) : null)
                                .homepageUrl(input.getHomepageUrl())
                                .source("MANUAL")
                                .sourceKey("MANUAL_" + java.util.UUID.randomUUID().toString())
                                .isAffiliate(true)
                                .build();
                DentalEntity saved = dentalRepository.save(dental);
                return AdminDentistDTO.builder()
                                .id(saved.getId().toString())
                                .displayId(0)
                                .name(saved.getName())
                                .address(saved.getAddress())
                                .phone(saved.getPhone())
                                .isPartner(saved.getIsAffiliate())
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
        public AdminDentistDTO updateDental(String id, DentalInputDTO input) {
                DentalEntity dental = dentalRepository.findById(java.util.UUID.fromString(id))
                                .orElseThrow(() -> new DentalException(DentalErrorCode.DENTAL_NOT_FOUND));

                // Null-safe update
                if (input.getName() != null)
                        dental.setName(input.getName());
                if (input.getAddress() != null) {
                        dental.setAddress(input.getAddress());
                        // Auto Geocoding
                        try {
                                Double[] coords = kakaoMapService.getCoordinates(input.getAddress());
                                if (coords != null) {
                                        dental.setLat(BigDecimal.valueOf(coords[0]));
                                        dental.setLng(BigDecimal.valueOf(coords[1]));
                                }
                        } catch (Exception e) {
                                log.error("Geocoding failed for address: {}", input.getAddress(), e);
                        }
                }
                if (input.getPhone() != null)
                        dental.setPhone(input.getPhone());
                if (input.getDescription() != null)
                        dental.setDescription(input.getDescription());
                if (input.getLatitude() != null)
                        dental.setLat(BigDecimal.valueOf(input.getLatitude()));
                if (input.getLongitude() != null)
                        dental.setLng(BigDecimal.valueOf(input.getLongitude()));
                if (input.getHomepageUrl() != null)
                        dental.setHomepageUrl(input.getHomepageUrl());

                dentalRepository.saveAndFlush(dental);
                return AdminDentistDTO.builder()
                                .id(dental.getId().toString())
                                .displayId(0)
                                .name(dental.getName())
                                .address(dental.getAddress())
                                .phone(dental.getPhone())
                                .isPartner(dental.getIsAffiliate())
                                .build();
        }

        @Override
        @Transactional
        public AdminProductDTO updateProduct(String id, ProductInputDTO input) {
                PartnerProduct product = partnerProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new AdminException(AdminErrorCode.PRODUCT_NOT_FOUND));

                String category = input.getCategory() != null ? input.getCategory() : product.getCategory();
                String name = input.getName() != null ? input.getName() : product.getName();
                // int type price matches input type, usually mandatory. If 0 is a valid update,
                // keep it.
                // But if logic requires checking for 0 to ignore, add condition. Here assuming
                // input price is valid if passed.
                int price = input.getPrice();

                // Optional fields
                String manufacturer = input.getManufacturer() != null ? input.getManufacturer()
                                : product.getManufacturer();
                String imageUrl = input.getImageUrl() != null ? input.getImageUrl() : product.getImageUrl();

                product.update(category, name, price, manufacturer, imageUrl);

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
                                .orElseThrow(() -> new AdminException(AdminErrorCode.INSURANCE_NOT_FOUND));

                String category = input.getCategory() != null ? input.getCategory() : insurance.getCategory();
                String name = input.getName() != null ? input.getName() : insurance.getName();
                int price = input.getPrice();
                String company = input.getCompany() != null ? input.getCompany() : insurance.getCompany();

                insurance.update(category, name, price, company);

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
        public AdminDentistDTO updateDentalPartnerStatus(String id, boolean isPartner) {
                DentalEntity dental = dentalRepository.findById(java.util.UUID.fromString(id))
                                .orElseThrow(() -> new DentalException(DentalErrorCode.DENTAL_NOT_FOUND));
                dental.setIsAffiliate(isPartner);
                dentalRepository.saveAndFlush(dental);
                return AdminDentistDTO.builder()
                                .id(dental.getId().toString())
                                .name(dental.getName())
                                .address(dental.getAddress())
                                .phone(dental.getPhone())
                                .isPartner(dental.getIsAffiliate())
                                .build();
        }

        @Override
        @Transactional
        public AdminProductDTO updateProductPartnerStatus(String id, boolean isPartner) {
                PartnerProduct product = partnerProductRepository.findById(Long.parseLong(id))
                                .orElseThrow(() -> new AdminException(AdminErrorCode.PRODUCT_NOT_FOUND));
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
                                .orElseThrow(() -> new AdminException(AdminErrorCode.INSURANCE_NOT_FOUND));
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
        public boolean deleteDental(String id) {
                try {
                        dentalRepository.deleteById(java.util.UUID.fromString(id));
                        return true;
                } catch (Exception e) {
                        log.error("Error deleting dental: {}", e.getMessage());
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
