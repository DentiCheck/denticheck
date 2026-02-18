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
import com.denticheck.api.common.util.AdminRoleOnly;
import com.denticheck.api.domain.admin.dto.AdminDailyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminWeeklyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminProductDTO;
import com.denticheck.api.domain.admin.dto.AdminInsuranceDTO;
import com.denticheck.api.domain.admin.service.AdminService;

import com.denticheck.api.domain.admin.dto.DentalInputDTO;
import com.denticheck.api.domain.admin.dto.ProductInputDTO;
import com.denticheck.api.domain.admin.dto.InsuranceInputDTO;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;

import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@AdminRoleOnly
@RequiredArgsConstructor
public class AdminResolver {

    private final AdminService adminService;

    // 0. 내 정보
    @QueryMapping
    public AdminUserDTO adminMe() {
        return adminService.getMe();
    }

    // 1. 대시보드
    @QueryMapping
    // [관리자 기능] [Security Reverted] 관리자 전용 데이터
    // 보호를 위해 복구
    public AdminDashboardStatsDTO adminDashboardStats() {
        return adminService.getDashboardStats();
    }

    @QueryMapping
    public List<AdminDailyUsageDTO> adminDailyUsage() {
        return adminService.getDailyUsage();
    }

    @QueryMapping
    public List<AdminWeeklyUsageDTO> adminWeeklyUsage() {
        return adminService.getWeeklyUsage();
    }

    @QueryMapping
    public List<AdminInquiryDTO> adminRecentInquiries() {
        return adminService.getRecentInquiries();
    }

    // 2. 회원 관리
    @QueryMapping
    public List<AdminUserDTO> adminUsers(
            @Argument("keyword") String keyword) {
        return adminService.getAllUsers(keyword);
    }

    @MutationMapping
    public AdminUserDTO updateUserStatus(
            @Argument("userId") String userId,
            @Argument("status") String status) {
        return adminService.updateUserStatus(userId, status);
    }

    // 3. 제휴 관리
    @QueryMapping
    public List<AdminDentistDTO> adminDentists(
            @Argument("keyword") String keyword,
            @Argument("filter") String filter) {
        return adminService.getAllDentists(keyword, filter);
    }

    @QueryMapping
    public List<AdminProductDTO> adminProducts(
            @Argument("category") String category,
            @Argument("keyword") String keyword) {
        return adminService.getAllProducts(category, keyword);
    }

    @QueryMapping
    public List<AdminInsuranceDTO> adminInsuranceProducts(
            @Argument("category") String category,
            @Argument("keyword") String keyword) {
        return adminService.getAllInsuranceProducts(category, keyword);
    }

    @MutationMapping
    public AdminDentistDTO createDental(@Argument DentalInputDTO input) {
        return adminService.createDental(input);
    }

    @MutationMapping
    public AdminProductDTO createProduct(
            @Argument("input") ProductInputDTO input) {
        return adminService.createProduct(input);
    }

    @MutationMapping
    public AdminInsuranceDTO createInsurance(
            @Argument("input") InsuranceInputDTO input) {
        return adminService.createInsurance(input);
    }

    @MutationMapping
    public AdminDentistDTO updateDental(
            @Argument("id") String id,
            @Argument("input") DentalInputDTO input) {
        return adminService.updateDental(id, input);
    }

    @MutationMapping
    public AdminProductDTO updateProduct(
            @Argument("id") String id,
            @Argument("input") ProductInputDTO input) {
        return adminService.updateProduct(id, input);
    }

    @MutationMapping
    public AdminInsuranceDTO updateInsurance(
            @Argument("id") String id,
            @Argument("input") InsuranceInputDTO input) {
        return adminService.updateInsurance(id, input);
    }

    @MutationMapping
    public boolean deleteDental(@Argument String id) {
        return adminService.deleteDental(id);
    }

    @MutationMapping
    public boolean deleteProduct(@Argument("id") String id) {
        return adminService.deleteProduct(id);
    }

    @MutationMapping
    public boolean deleteInsurance(@Argument("id") String id) {
        return adminService.deleteInsurance(id);
    }

    // 4. 제휴 상태 관리
    @MutationMapping
    public AdminDentistDTO updateDentalPartnerStatus(@Argument String id, @Argument boolean isPartner) {
        return adminService.updateDentalPartnerStatus(id, isPartner);
    }

    @MutationMapping
    public AdminProductDTO updateProductPartnerStatus(
            @Argument("id") String id,
            @Argument("isPartner") boolean isPartner) {
        return adminService.updateProductPartnerStatus(id, isPartner);
    }

    @MutationMapping
    public AdminInsuranceDTO updateInsurancePartnerStatus(
            @Argument("id") String id,
            @Argument("isPartner") boolean isPartner) {
        return adminService.updateInsurancePartnerStatus(id, isPartner);
    }
}
