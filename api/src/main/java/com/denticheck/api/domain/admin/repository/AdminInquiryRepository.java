/** [관리자 기능] 관리자 문의 레포지토리 */
package com.denticheck.api.domain.admin.repository;

import com.denticheck.api.domain.admin.entity.AdminInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminInquiryRepository extends JpaRepository<AdminInquiry, Long> {
    List<AdminInquiry> findTop5ByOrderByCreatedAtDesc();

    long countByCreatedAtAfter(LocalDateTime start);
}
