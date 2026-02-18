package com.denticheck.api.domain.user.entity;

import com.denticheck.api.domain.user.dto.UserRequestDTO;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Entity
public class UserEntity extends com.denticheck.api.common.entity.BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "username", unique = true, nullable = false, updatable = false)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @ColumnDefault("'ACTIVE'")
    @Builder.Default
    private UserStatusType userStatusType = UserStatusType.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "signup_provider")
    private SocialProviderType socialProviderType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private RoleEntity role;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "email")
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "profile_image")
    private String profileImage;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    public void updateUser(UserRequestDTO dto) {
        this.email = dto.getEmail();
        this.nickname = dto.getNickname();
        this.profileImage = dto.getProfileImage();
    }

    public void updateStatus(UserStatusType status) {
        this.userStatusType = status;
    }

    public void updateRole(RoleEntity role) {
        this.role = role;
    }

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<com.denticheck.api.domain.dental.entity.DentalLikeEntity> favorites = new java.util.ArrayList<>();
}
