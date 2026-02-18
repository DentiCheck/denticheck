package com.denticheck.api.domain.community.entity;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
    name = "community_comment_dentals",
    uniqueConstraints = @UniqueConstraint(columnNames = { "comment_id", "dental_id" })
)
public class CommunityCommentDentalEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "comment_id", nullable = false)
    private UUID commentId;

    @Column(name = "dental_id", nullable = false)
    private UUID dentalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false, insertable = false, updatable = false)
    @Setter
    private CommunityCommentEntity comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dental_id", nullable = false, insertable = false, updatable = false)
    @Setter
    private DentalEntity dental;
}
