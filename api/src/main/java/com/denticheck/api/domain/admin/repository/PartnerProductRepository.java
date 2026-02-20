/** [관리자 기능] 관리자 제휴 상품 레포지토리 */
package com.denticheck.api.domain.admin.repository;

import com.denticheck.api.domain.admin.entity.PartnerProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PartnerProductRepository extends JpaRepository<PartnerProduct, Long> {
        List<PartnerProduct> findByCategoryContainingOrNameContainingOrderByCreatedAtDescIdDesc(String category,
                        String name);

        List<PartnerProduct> findAllByOrderByCreatedAtDescIdDesc();
}
