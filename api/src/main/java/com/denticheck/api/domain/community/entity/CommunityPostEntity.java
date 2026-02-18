package com.denticheck.api.domain.community.entity;

import com.denticheck.api.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "community_posts")
public class CommunityPostEntity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    /** 작성자 표시 이름 (닉네임 또는 사용자명) */
    @Column(name = "author_name", nullable = false, length = 100)
    private String authorName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "like_count", nullable = false)
    @Builder.Default
    private Integer likeCount = 0;

    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount != null ? likeCount : 0;
    }

    @Column(name = "comment_count", nullable = false)
    @Builder.Default
    private Integer commentCount = 0;

    public void setCommentCount(Integer commentCount) {
        this.commentCount = commentCount != null ? commentCount : 0;
    }

    /** 게시글 종류: product(상품후기), hospital(병원후기), null이면 전체(일반) */
    @Column(name = "post_type", length = 20)
    private String postType;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommunityPostDentalEntity> dentalLinks = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<CommunityPostImageEntity> imageLinks = new ArrayList<>();
}
