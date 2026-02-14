/** [관리자 기능] 관리자 제휴 보험 레포지토리 */
package com.denticheck.api.domain.admin.repository;

import com.denticheck.api.domain.admin.entity.InsuranceProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InsuranceProductRepository extends JpaRepository<InsuranceProduct, Long> {
    List<InsuranceProduct> findByCategoryContainingOrNameContaining(String category, String name);
}
