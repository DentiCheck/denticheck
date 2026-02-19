package com.denticheck.api.domain.community.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** 커뮤니티 게시글 댓글 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "community_comments")
public class CommunityCommentEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPostEntity post;

    /** 부모 댓글 (답글인 경우). null이면 최상위 댓글 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private CommunityCommentEntity parentComment;

    /** 작성자 표시 이름 (닉네임 또는 사용자명) */
    @Column(name = "author_name", nullable = false, length = 100)
    private String authorName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    public void setContent(String content) {
        this.content = content != null ? content : "";
    }

    /** 좋아요(추천) 수 - 누가 눌렀는지는 저장하지 않음 */
    @Column(name = "like_count", nullable = false)
    @Builder.Default
    private Integer likeCount = 0;

    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount != null ? likeCount : 0;
    }

    /** 첨부 이미지 (일단 이미지만) */
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<CommunityCommentImageEntity> images = new ArrayList<>();

    /** 병원 태그 링크 */
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommunityCommentDentalEntity> dentalLinks = new ArrayList<>();

    /** 상품 태그 링크 */
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommunityCommentProductEntity> productLinks = new ArrayList<>();
}
