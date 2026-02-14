/**
 * Backend File: Admin Service Interface
 * Path: api/src/main/java/com/denticheck/api/domain/admin/service/AdminService.java
 * Description: [관리자 기능] 관리자 대시보드 및 데이터 관리를 위한 서비스 명세
 */
package com.denticheck.api.domain.admin.service;

import com.denticheck.api.domain.admin.dto.AdminDashboardStatsDTO;
import com.denticheck.api.domain.admin.dto.AdminUserDTO;
import com.denticheck.api.domain.admin.dto.AdminDentistDTO;
import com.denticheck.api.domain.admin.dto.AdminInquiryDTO;
import com.denticheck.api.domain.admin.dto.AdminDailyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminWeeklyUsageDTO;
import com.denticheck.api.domain.admin.dto.AdminProductDTO;
import com.denticheck.api.domain.admin.dto.AdminInsuranceDTO;

import java.util.List;

public interface AdminService {
    // 1. 대시보드
    AdminDashboardStatsDTO getDashboardStats();

    List<AdminDailyUsageDTO> getDailyUsage();

    List<AdminWeeklyUsageDTO> getWeeklyUsage();

    List<AdminInquiryDTO> getRecentInquiries();

    // 2. 회원 관리
    List<AdminUserDTO> getAllUsers(String keyword);

    AdminUserDTO updateUserStatus(String userId, String status);

    // 3. 제휴 치과 관리
    List<AdminDentistDTO> getAllDentists(String keyword);
    // Hospital CRUD (Input 객체 대신 개별 파라미터나 Map 사용 가능하지만 예시로 생략 혹은 추가)

    // 4. 제휴 상품 및 보험 관리
    List<AdminProductDTO> getAllProducts(String category, String keyword);

    List<AdminInsuranceDTO> getAllInsuranceProducts(String category, String keyword);
}
