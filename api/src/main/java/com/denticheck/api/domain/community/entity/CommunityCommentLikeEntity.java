package com.denticheck.api.domain.community.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** 댓글 좋아요 - 1인 1댓글당 1회만 (중복/무한 좋아요 방지) */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
    name = "community_comment_likes",
    uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "comment_id" })
)
public class CommunityCommentLikeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "comment_id", nullable = false)
    private UUID commentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", insertable = false, updatable = false)
    private CommunityCommentEntity comment;
}
