/**
 * Backend File: Admin GraphQL Resolver
 * Path: api/src/main/java/com/denticheck/api/graphql/resolver/AdminResolver.java
 * Description: [관리자 기능] 관리자 콘솔을 위한 GraphQL Query 및 Mutation 처리기
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class AdminResolver {

    private final AdminService adminService;

    // 1. 대시보드
    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')") // [관리자 기능] [Security Reverted] 관리자 전용 데이터 보호를 위해 복구
    public AdminDashboardStatsDTO adminDashboardStats() {
        return adminService.getDashboardStats();
    }

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminDailyUsageDTO> adminDailyUsage() {
        return adminService.getDailyUsage();
    }

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminWeeklyUsageDTO> adminWeeklyUsage() {
        return adminService.getWeeklyUsage();
    }

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminInquiryDTO> adminRecentInquiries() {
        return adminService.getRecentInquiries();
    }

    // 2. 회원 관리
    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminUserDTO> adminUsers(@org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllUsers(keyword);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    @PreAuthorize("hasRole('ADMIN')")
    public AdminUserDTO updateUserStatus(
            @org.springframework.graphql.data.method.annotation.Argument String userId,
            @org.springframework.graphql.data.method.annotation.Argument String status) {
        return adminService.updateUserStatus(userId, status);
    }

    // 3. 제휴 관리
    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminDentistDTO> adminDentists(
            @org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllDentists(keyword);
    }

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminProductDTO> adminProducts(
            @org.springframework.graphql.data.method.annotation.Argument String category,
            @org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllProducts(category, keyword);
    }

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminInsuranceDTO> adminInsuranceProducts(
            @org.springframework.graphql.data.method.annotation.Argument String category,
            @org.springframework.graphql.data.method.annotation.Argument String keyword) {
        return adminService.getAllInsuranceProducts(category, keyword);
    }
}
