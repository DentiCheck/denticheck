/**
 * Backend File: Admin GraphQL Resolver
 * Path: api/src/main/java/com/denticheck/api/graphql/resolver/AdminResolver.java
 * Description: [관리자 기능] 관리자 콘솔을 위한 GraphQL Query 및 Mutation 처리기
 * - 대시보드 통계, 회원/치과/상품/보험 관리 API 제공
 */
package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.admin.dto.AdminDashboardStatsDTO;
import com.denticheck.api.domain.admin.dto.AdminUserDTO;
import com.denticheck.api.domain.admin.dto.AdminDentistDTO;
import com.denticheck.api.domain.admin.dto.AdminInquiryDTO;
import com.denticheck.api.domain.admin.dto.AdminDailyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminWeeklyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminProductDTO;
import com.denticheck.api.domain.admin.dto.AdminInsuranceDTO;
import com.denticheck.api.domain.admin.service.AdminService;

import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class AdminResolver {

    private final AdminService adminService;

    // 1. 대시보드
    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')") // [관리자 기능] [Security Reverted] 관리자 전용 데이터
    // 보호를 위해 복구
    public AdminDashboardStatsDTO adminDashboardStats() {
        return adminService.getDashboardStats();
    }

    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminDailyUsageDTO> adminDailyUsage() {
        return adminService.getDailyUsage();
    }

    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminWeeklyUsageDTO> adminWeeklyUsage() {
        return adminService.getWeeklyUsage();
    }

    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminInquiryDTO> adminRecentInquiries() {
        return adminService.getRecentInquiries();
    }

    // 2. 회원 관리
    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminUserDTO> adminUsers(@org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllUsers(keyword);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public AdminUserDTO updateUserStatus(
            @org.springframework.graphql.data.method.annotation.Argument String userId,
            @org.springframework.graphql.data.method.annotation.Argument String status) {
        return adminService.updateUserStatus(userId, status);
    }

    // 3. 제휴 관리
    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminDentistDTO> adminDentists(
            @org.springframework.graphql.data.method.annotation.Argument String keyword,
            @org.springframework.graphql.data.method.annotation.Argument String filter) {
        return adminService.getAllDentists(keyword, filter);
    }

    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminProductDTO> adminProducts(
            @org.springframework.graphql.data.method.annotation.Argument String category,
            @org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllProducts(category, keyword);
    }

    @QueryMapping
    // @PreAuthorize("hasRole('ADMIN')")
    public List<AdminInsuranceDTO> adminInsuranceProducts(
            @org.springframework.graphql.data.method.annotation.Argument String category,
            @org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllInsuranceProducts(category, keyword);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminDentistDTO createHospital(
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.HospitalInputDTO input) {
        return adminService.createHospital(input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminProductDTO createProduct(
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.ProductInputDTO input) {
        return adminService.createProduct(input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminInsuranceDTO createInsurance(
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.InsuranceInputDTO input) {
        return adminService.createInsurance(input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminDentistDTO updateHospital(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.HospitalInputDTO input) {
        return adminService.updateHospital(id, input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminProductDTO updateProduct(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.ProductInputDTO input) {
        return adminService.updateProduct(id, input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminInsuranceDTO updateInsurance(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument com.denticheck.api.domain.admin.dto.InsuranceInputDTO input) {
        return adminService.updateInsurance(id, input);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public boolean deleteHospital(@org.springframework.graphql.data.method.annotation.Argument String id) {
        return adminService.deleteHospital(id);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public boolean deleteProduct(@org.springframework.graphql.data.method.annotation.Argument String id) {
        return adminService.deleteProduct(id);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public boolean deleteInsurance(@org.springframework.graphql.data.method.annotation.Argument String id) {
        return adminService.deleteInsurance(id);
    }

    // 4. 제휴 상태 관리
    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminDentistDTO updateHospitalPartnerStatus(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument boolean isPartner) {
        return adminService.updateHospitalPartnerStatus(id, isPartner);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminProductDTO updateProductPartnerStatus(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument boolean isPartner) {
        return adminService.updateProductPartnerStatus(id, isPartner);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public AdminInsuranceDTO updateInsurancePartnerStatus(
            @org.springframework.graphql.data.method.annotation.Argument String id,
            @org.springframework.graphql.data.method.annotation.Argument boolean isPartner) {
        return adminService.updateInsurancePartnerStatus(id, isPartner);
    }
}
