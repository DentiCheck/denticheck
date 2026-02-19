package com.denticheck.api.domain.community.entity;

import com.denticheck.api.domain.admin.entity.PartnerProduct;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
    name = "community_comment_products",
    uniqueConstraints = @UniqueConstraint(columnNames = { "comment_id", "product_id" })
)
public class CommunityCommentProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "comment_id", nullable = false)
    private UUID commentId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false, insertable = false, updatable = false)
    @Setter
    private CommunityCommentEntity comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false, insertable = false, updatable = false)
    @Setter
    private PartnerProduct product;
}
