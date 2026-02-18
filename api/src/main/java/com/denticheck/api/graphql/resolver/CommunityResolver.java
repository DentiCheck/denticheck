package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.community.dto.CommunityCommentDto;
import com.denticheck.api.domain.community.dto.CommunityPostDto;
import com.denticheck.api.domain.community.dto.PostLikeResultDto;
import com.denticheck.api.domain.community.entity.CommunityCommentEntity;
import com.denticheck.api.domain.community.entity.CommunityCommentDentalEntity;
import com.denticheck.api.domain.community.entity.CommunityCommentImageEntity;
import com.denticheck.api.domain.community.entity.CommunityCommentLikeEntity;
import com.denticheck.api.domain.community.entity.CommunityPostLikeEntity;
import com.denticheck.api.domain.community.entity.CommunityPostEntity;
import com.denticheck.api.domain.community.repository.CommunityCommentDentalRepository;
import com.denticheck.api.domain.community.repository.CommunityCommentLikeRepository;
import com.denticheck.api.domain.community.repository.CommunityCommentRepository;
import com.denticheck.api.domain.community.repository.CommunityPostLikeRepository;
import com.denticheck.api.domain.community.repository.CommunityPostRepository;
import com.denticheck.api.domain.community.service.CommunityCommentService;
import com.denticheck.api.domain.community.service.CommunityImageUploadService;
import com.denticheck.api.domain.community.service.CommunityPostService;
import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CommunityResolver {
    
    @PersistenceContext
    private EntityManager entityManager;

    private final CommunityPostService communityPostService;
    private final CommunityCommentService communityCommentService;
    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityCommentDentalRepository communityCommentDentalRepository;
    private final CommunityCommentLikeRepository communityCommentLikeRepository;
    private final CommunityPostRepository communityPostRepository;
    private final CommunityImageUploadService communityImageUploadService;
    private final UserRepository userRepository;
    private final DentalRepository dentalRepository;

    @QueryMapping
    public List<CommunityPostDto> posts(
            @Argument("limit") Integer limit,
            @Argument("offset") Integer offset,
            @Argument("postType") String postType) {
        List<CommunityPostDto> list = (limit != null || offset != null || postType != null)
                ? communityPostService.findAll(limit != null ? limit : 10, offset != null ? offset : 0, postType)
                : communityPostService.findAll();
        String currentAuthorName = getCurrentUserDisplayNameOrNull();
        UUID currentUserId = getCurrentUserIdOrNull();
        Set<UUID> likedPostIds = currentUserId != null
                ? communityPostLikeRepository.findByUserId(currentUserId).stream()
                        .map(CommunityPostLikeEntity::getPostId)
                        .collect(Collectors.toSet())
                : Collections.emptySet();
        list.forEach(dto -> {
            dto.setIsMine(currentAuthorName != null && currentAuthorName.equals(dto.getAuthor()));
            dto.setIsLiked(likedPostIds.contains(dto.getId()));
        });
        return list;
    }

    @QueryMapping
    public List<CommunityCommentDto> comments(
            @Argument("postId") String postIdStr,
            @Argument("limit") Integer limit,
            @Argument("offset") Integer offset) {
        UUID postId;
        try {
            postId = UUID.fromString(postIdStr);
        } catch (IllegalArgumentException e) {
            return Collections.emptyList();
        }
        int limitVal = limit != null && limit > 0 ? limit : 10;
        int offsetVal = offset != null && offset >= 0 ? offset : 0;
        Pageable pageable = PageRequest.of(offsetVal / limitVal, limitVal);
        String currentAuthorName = getCurrentUserDisplayNameOrNull();
        UUID currentUserId = getCurrentUserIdOrNull();
        
        // 먼저 페이징으로 댓글 ID만 조회 (최신순)
        List<UUID> commentIds = communityCommentRepository.findIdsByPostIdOrderByCreatedAtDesc(postId, pageable);
        if (commentIds.isEmpty()) {
            return Collections.emptyList();
        }
        
        // dentalLinks 포함해서 다시 조회 (게시글과 동일한 방식)
        log.info("[댓글 조회] 조회할 댓글 ID 개수: {}", commentIds.size());
        List<CommunityCommentEntity> entities = communityCommentRepository.findAllWithDentalsByIdIn(commentIds);
        log.info("[댓글 조회] 조회된 엔티티 개수: {}", entities.size());
        
        // IN 조회는 순서 보장이 없어서, id 순서대로 정렬 (createdAt 순서 유지)
        java.util.Map<UUID, Integer> orderMap = new java.util.HashMap<>();
        for (int i = 0; i < commentIds.size(); i++) {
            orderMap.put(commentIds.get(i), i);
        }
        entities.sort(java.util.Comparator.comparingInt(e -> orderMap.getOrDefault(e.getId(), Integer.MAX_VALUE)));
        
        // 각 댓글의 dentalLinks 상태 로깅
        for (CommunityCommentEntity e : entities) {
            log.info("[댓글 조회] 댓글 ID: {}, dentalLinks 개수: {}, dentalLinks 상세: {}", 
                    e.getId(),
                    e.getDentalLinks() != null ? e.getDentalLinks().size() : 0,
                    e.getDentalLinks() != null ? e.getDentalLinks().stream()
                            .map(l -> l.getDentalId() + "(" + (l.getDental() != null ? l.getDental().getName() : "null") + ")")
                            .collect(Collectors.joining(", ")) : "null");
        }
        Set<UUID> likedCommentIds = new HashSet<>();
        if (currentUserId != null && !entities.isEmpty()) {
            likedCommentIds = communityCommentLikeRepository.findByUserIdAndCommentIdIn(currentUserId, commentIds)
                    .stream()
                    .map(CommunityCommentLikeEntity::getCommentId)
                    .collect(Collectors.toSet());
        }
        Set<UUID> finalLikedCommentIds = likedCommentIds;
        java.util.Map<UUID, Integer> replyCountMap = new java.util.HashMap<>();
        for (UUID id : commentIds) {
            replyCountMap.put(id, (int) communityCommentRepository.countByParentComment_Id(id));
        }
        return entities.stream()
                .map(e -> commentToDto(e, currentAuthorName, finalLikedCommentIds.contains(e.getId()),
                        replyCountMap.getOrDefault(e.getId(), 0)))
                .collect(Collectors.toList());
    }

    @QueryMapping
    public List<CommunityCommentDto> replies(@Argument("parentCommentId") String parentCommentIdStr) {
        UUID parentId;
        try {
            parentId = UUID.fromString(parentCommentIdStr);
        } catch (IllegalArgumentException e) {
            return Collections.emptyList();
        }
        List<UUID> replyIds = communityCommentRepository.findIdsByParentComment_IdOrderByCreatedAtAsc(parentId);
        if (replyIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<CommunityCommentEntity> entities = communityCommentRepository.findAllWithDentalsByIdIn(replyIds);
        java.util.Map<UUID, Integer> orderMap = new java.util.HashMap<>();
        for (int i = 0; i < replyIds.size(); i++) {
            orderMap.put(replyIds.get(i), i);
        }
        entities.sort(java.util.Comparator.comparingInt(e -> orderMap.getOrDefault(e.getId(), Integer.MAX_VALUE)));
        String currentAuthorName = getCurrentUserDisplayNameOrNull();
        UUID currentUserId = getCurrentUserIdOrNull();
        Set<UUID> likedIds = Collections.emptySet();
        if (currentUserId != null) {
            likedIds = communityCommentLikeRepository.findByUserIdAndCommentIdIn(currentUserId, replyIds)
                    .stream()
                    .map(CommunityCommentLikeEntity::getCommentId)
                    .collect(Collectors.toSet());
        }
        Set<UUID> finalLikedIds = likedIds;
        return entities.stream()
                .map(e -> commentToDto(e, currentAuthorName, finalLikedIds.contains(e.getId()), 0))
                .collect(Collectors.toList());
    }

    private CommunityCommentDto commentToDto(CommunityCommentEntity e, String currentAuthorName, boolean isLiked, int replyCount) {
        String authorName = e.getAuthorName() != null ? e.getAuthorName() : "";
        boolean isMine = currentAuthorName != null && currentAuthorName.equals(authorName);
        String createdAt = e.getCreatedAt() != null
                ? e.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toString()
                : null;
        List<String> imageUrls = e.getImages() == null ? Collections.emptyList()
                : e.getImages().stream()
                        .sorted(Comparator.comparing(CommunityCommentImageEntity::getSortOrder))
                        .map(CommunityCommentImageEntity::getImageUrl)
                        .collect(Collectors.toList());
        List<CommunityPostDto.PostTagDto> tags = new ArrayList<>();
        log.debug("[commentToDto] 댓글 ID: {}, dentalLinks: {}", e.getId(), e.getDentalLinks() != null ? e.getDentalLinks().size() : "null");
        if (e.getDentalLinks() != null && !e.getDentalLinks().isEmpty()) {
            log.debug("[commentToDto] dentalLinks 상세: {}", e.getDentalLinks().stream()
                    .map(l -> l.getDentalId() + "->" + (l.getDental() != null ? l.getDental().getName() : "null"))
                    .collect(Collectors.joining(", ")));
            e.getDentalLinks().stream()
                    .map(CommunityCommentDentalEntity::getDental)
                    .filter(d -> d != null)
                    .forEach(dental -> {
                        log.debug("[commentToDto] 태그 추가: {}", dental.getName());
                        tags.add(new CommunityPostDto.PostTagDto("hospital", dental.getName() != null ? dental.getName() : "", dental.getId()));
                    });
        }
        log.info("[commentToDto] 댓글 ID: {}, 최종 tags 개수: {}", e.getId(), tags.size());
        return CommunityCommentDto.builder()
                .id(e.getId())
                .author(authorName)
                .content(e.getContent() != null ? e.getContent() : "")
                .images(imageUrls)
                .tags(tags)
                .createdAt(createdAt)
                .likes(e.getLikeCount() != null ? e.getLikeCount() : 0)
                .isLiked(isLiked)
                .isMine(isMine)
                .replyCount(replyCount)
                .build();
    }

    @QueryMapping
    public CommunityPostDto post(@Argument("id") String idStr) {
        UUID postId;
        try {
            postId = UUID.fromString(idStr);
        } catch (IllegalArgumentException e) {
            return null;
        }
        return communityPostService.findById(postId).map(dto -> {
            String currentAuthorName = getCurrentUserDisplayNameOrNull();
            UUID currentUserId = getCurrentUserIdOrNull();
            dto.setIsMine(currentAuthorName != null && currentAuthorName.equals(dto.getAuthor()));
            dto.setIsLiked(currentUserId != null && communityPostLikeRepository.existsByUserIdAndPostId(currentUserId, postId));
            return dto;
        }).orElse(null);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public boolean deletePost(@Argument("id") String idStr) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        String authorName = getCurrentUserDisplayNameOrNull();
        if (authorName == null) authorName = username;
        UUID postId;
        try {
            postId = UUID.fromString(idStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 게시글 ID입니다.");
        }
        communityPostService.deleteIfAuthor(postId, authorName);
        return true;
    }

    private String getCurrentUserDisplayNameOrNull() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username == null || username.isBlank()) return null;
            return userRepository.findByUsername(username)
                    .map(user -> (user.getNickname() != null && !user.getNickname().isBlank())
                            ? user.getNickname()
                            : user.getUsername())
                    .orElse(username);
        } catch (Exception e) {
            return null;
        }
    }

    private UUID getCurrentUserIdOrNull() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username == null || username.isBlank()) return null;
            return userRepository.findByUsername(username).map(u -> u.getId()).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public CommunityPostDto createPost(@Argument("input") CreatePostInput input) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        String authorName = userRepository.findByUsername(username)
                .map(user -> (user.getNickname() != null && !user.getNickname().isBlank())
                        ? user.getNickname()
                        : user.getUsername())
                .orElse(username);
        List<UUID> dentalIds;
        try {
            dentalIds = parseDentalIds(input.getDentalIds());
        } catch (Exception e) {
            throw new IllegalArgumentException("치과 태그 ID 변환 실패: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()), e);
        }
        List<String> imageUrls = input.getImageUrls() != null ? input.getImageUrls() : new ArrayList<>();
        try {
            CommunityPostDto created = communityPostService.create(authorName, input.getContent(), input.getPostType(), dentalIds, imageUrls);
            created.setIsMine(true);
            created.setIsLiked(false);
            return created;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            // 클라이언트에 실제 원인 전달 (예: "일부 치과 ID가 존재하지 않습니다" 등)
            Throwable cause = e.getCause();
            String detail = (cause != null && cause.getMessage() != null && !cause.getMessage().isBlank())
                    ? cause.getMessage()
                    : e.getMessage();
            String message = (detail != null && !detail.isBlank())
                    ? detail
                    : "게시글 등록 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
            throw new RuntimeException(message, e);
        }
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public CommunityCommentDto createComment(@Argument("input") CreateCommentInput input) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        String authorName = userRepository.findByUsername(username)
                .map(user -> (user.getNickname() != null && !user.getNickname().isBlank())
                        ? user.getNickname()
                        : user.getUsername())
                .orElse(username);
        if (input.getContent() == null || input.getContent().isBlank()) {
            throw new IllegalArgumentException("댓글 내용을 입력해 주세요.");
        }
        UUID postId;
        try {
            postId = UUID.fromString(input.getPostId());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 게시글 ID입니다.");
        }
        CommunityPostEntity post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        CommunityCommentEntity comment = CommunityCommentEntity.builder()
                .post(post)
                .authorName(authorName)
                .content(input.getContent().trim())
                .likeCount(0)
                .build();
        comment = communityCommentRepository.save(comment);
        if (input.getImageUrl() != null && !input.getImageUrl().isBlank()) {
            comment.getImages().add(CommunityCommentImageEntity.builder()
                    .comment(comment)
                    .imageUrl(input.getImageUrl().trim())
                    .sortOrder(0)
                    .build());
        }
        // 병원 태그 처리
        log.info("[댓글 작성] dentalIds 입력값: {}", input.getDentalIds());
        List<UUID> dentalIds;
        try {
            dentalIds = parseDentalIds(input.getDentalIds());
            log.info("[댓글 작성] parseDentalIds 결과: {}", dentalIds);
        } catch (Exception e) {
            log.error("[댓글 작성] dentalIds 파싱 실패", e);
            throw new IllegalArgumentException("치과 태그 ID 변환 실패: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()), e);
        }
        if (dentalIds != null && !dentalIds.isEmpty()) {
            log.info("[댓글 작성] dentalIds 처리 시작: {}", dentalIds);
            List<UUID> distinctIds = dentalIds.stream().distinct().toList();
            List<DentalEntity> existingDentals = dentalRepository.findAllById(distinctIds);
            Set<UUID> existingIds = existingDentals.stream().map(DentalEntity::getId).collect(Collectors.toSet());
            if (existingIds.size() != distinctIds.size()) {
                throw new IllegalArgumentException(
                    "선택한 치과 중 등록되지 않은 항목이 있어요. 치과 목록을 다시 불러온 뒤 다시 선택해 주세요.");
            }
            UUID commentId = comment.getId();
            List<CommunityCommentDentalEntity> links = new ArrayList<>();
            // dentalId를 dental 엔티티로 매핑
            java.util.Map<UUID, DentalEntity> dentalMap = existingDentals.stream()
                    .collect(Collectors.toMap(DentalEntity::getId, d -> d));
            for (UUID dentalId : distinctIds) {
                DentalEntity dental = dentalMap.get(dentalId);
                if (dental == null) {
                    throw new IllegalArgumentException("치과를 찾을 수 없습니다: " + dentalId);
                }
                CommunityCommentDentalEntity link = CommunityCommentDentalEntity.builder()
                        .commentId(commentId)
                        .dentalId(dentalId)
                        .build();
                link.setComment(comment);
                link.setDental(dental);
                links.add(link);
            }
            comment.getDentalLinks().addAll(links);
            log.info("[댓글 작성] dentalLinks 추가 완료. 링크 개수: {}, 댓글 ID: {}", links.size(), comment.getId());
        } else {
            log.info("[댓글 작성] dentalIds가 비어있음");
        }
        comment = communityCommentRepository.save(comment);
        log.info("[댓글 작성] 댓글 저장 완료. ID: {}, dentalLinks 개수: {}", comment.getId(), comment.getDentalLinks() != null ? comment.getDentalLinks().size() : 0);
        post.setCommentCount((post.getCommentCount() == null ? 0 : post.getCommentCount()) + 1);
        communityPostRepository.save(post);
        // dentalLinks(dental 포함)까지 로드해서 응답에 tags가 나오게 함
        comment = communityCommentRepository.findByIdWithDentals(comment.getId()).orElse(comment);
        log.info("[댓글 작성] 조회 후 dentalLinks 개수: {}, dentalLinks: {}", 
                comment.getDentalLinks() != null ? comment.getDentalLinks().size() : 0,
                comment.getDentalLinks() != null ? comment.getDentalLinks().stream()
                        .map(l -> l.getDentalId() + "(" + (l.getDental() != null ? l.getDental().getName() : "null") + ")")
                        .collect(Collectors.joining(", ")) : "null");
        CommunityCommentDto dto = commentToDto(comment, authorName, false, 0);
        log.info("[댓글 작성] commentToDto 결과 - tags 개수: {}, tags: {}", 
                dto.getTags() != null ? dto.getTags().size() : 0,
                dto.getTags() != null ? dto.getTags().stream()
                        .map(t -> t.getType() + ":" + t.getName())
                        .collect(Collectors.joining(", ")) : "null");
        return dto;
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public boolean deleteComment(@Argument("id") String commentIdStr) {
        String authorName = getCurrentUserDisplayNameOrNull();
        if (authorName == null) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        UUID commentId;
        try {
            commentId = UUID.fromString(commentIdStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 댓글 ID입니다.");
        }
        CommunityCommentEntity comment = communityCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!authorName.equals(comment.getAuthorName())) {
            throw new org.springframework.security.access.AccessDeniedException("본인 댓글만 삭제할 수 있습니다.");
        }
        List<String> imageUrls = comment.getImages().stream()
                .map(CommunityCommentImageEntity::getImageUrl)
                .collect(Collectors.toList());
        CommunityPostEntity post = comment.getPost();
        int toDecrement = 1;
        if (comment.getParentComment() == null) {
            toDecrement += (int) communityCommentRepository.countByParentComment_Id(comment.getId());
        }
        communityCommentRepository.delete(comment);
        post.setCommentCount(Math.max(0, (post.getCommentCount() == null ? 0 : post.getCommentCount()) - toDecrement));
        communityPostRepository.save(post);
        imageUrls.forEach(communityImageUploadService::deleteByUrl);
        return true;
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    @Transactional
    public CommunityCommentDto createReply(@Argument("input") CreateReplyInput input) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        String authorName = userRepository.findByUsername(username)
                .map(user -> (user.getNickname() != null && !user.getNickname().isBlank())
                        ? user.getNickname()
                        : user.getUsername())
                .orElse(username);
        if (input.getContent() == null || input.getContent().isBlank()) {
            throw new IllegalArgumentException("답글 내용을 입력해 주세요.");
        }
        UUID parentId;
        try {
            parentId = UUID.fromString(input.getParentCommentId());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 부모 댓글 ID입니다.");
        }
        CommunityCommentEntity parent = communityCommentRepository.findByIdWithDentals(parentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        CommunityPostEntity post = parent.getPost();
        CommunityCommentEntity reply = CommunityCommentEntity.builder()
                .post(post)
                .parentComment(parent)
                .authorName(authorName)
                .content(input.getContent().trim())
                .likeCount(0)
                .build();
        reply = communityCommentRepository.save(reply);
        if (input.getImageUrl() != null && !input.getImageUrl().isBlank()) {
            reply.getImages().add(CommunityCommentImageEntity.builder()
                    .comment(reply)
                    .imageUrl(input.getImageUrl().trim())
                    .sortOrder(0)
                    .build());
        }
        List<UUID> dentalIds = parseDentalIds(input.getDentalIds());
        if (dentalIds != null && !dentalIds.isEmpty()) {
            List<UUID> distinctIds = dentalIds.stream().distinct().toList();
            List<DentalEntity> existingDentals = dentalRepository.findAllById(distinctIds);
            Set<UUID> existingIds = existingDentals.stream().map(DentalEntity::getId).collect(Collectors.toSet());
            if (existingIds.size() != distinctIds.size()) {
                throw new IllegalArgumentException(
                        "선택한 치과 중 등록되지 않은 항목이 있어요. 치과 목록을 다시 불러온 뒤 다시 선택해 주세요.");
            }
            java.util.Map<UUID, DentalEntity> dentalMap = existingDentals.stream()
                    .collect(Collectors.toMap(DentalEntity::getId, d -> d));
            for (UUID dentalId : distinctIds) {
                DentalEntity dental = dentalMap.get(dentalId);
                if (dental == null) throw new IllegalArgumentException("치과를 찾을 수 없습니다: " + dentalId);
                CommunityCommentDentalEntity link = CommunityCommentDentalEntity.builder()
                        .commentId(reply.getId())
                        .dentalId(dentalId)
                        .build();
                link.setComment(reply);
                link.setDental(dental);
                reply.getDentalLinks().add(link);
            }
        }
        reply = communityCommentRepository.save(reply);
        post.setCommentCount((post.getCommentCount() == null ? 0 : post.getCommentCount()) + 1);
        communityPostRepository.save(post);
        reply = communityCommentRepository.findByIdWithDentals(reply.getId()).orElse(reply);
        return commentToDto(reply, authorName, false, 0);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    @Transactional
    public CommunityCommentDto updateComment(@Argument("input") UpdateCommentInput input) {
        String authorName = getCurrentUserDisplayNameOrNull();
        if (authorName == null) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        if (input.getContent() == null || input.getContent().isBlank()) {
            throw new IllegalArgumentException("댓글 내용을 입력해 주세요.");
        }
        UUID commentId;
        try {
            commentId = UUID.fromString(input.getId());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 댓글 ID입니다.");
        }
        // dentalLinks를 함께 로드하여 수정 시 제대로 삭제되도록 함
        CommunityCommentEntity comment = communityCommentRepository.findByIdWithDentals(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!authorName.equals(comment.getAuthorName())) {
            throw new org.springframework.security.access.AccessDeniedException("본인 댓글만 수정할 수 있습니다.");
        }
        comment.setContent(input.getContent().trim());
        if (input.getImageUrl() != null) {
            List<String> oldUrls = comment.getImages().stream()
                    .map(CommunityCommentImageEntity::getImageUrl)
                    .collect(Collectors.toList());
            comment.getImages().clear();
            if (!input.getImageUrl().isBlank()) {
                comment.getImages().add(CommunityCommentImageEntity.builder()
                        .comment(comment)
                        .imageUrl(input.getImageUrl().trim())
                        .sortOrder(0)
                        .build());
            }
            comment = communityCommentRepository.save(comment);
            oldUrls.forEach(communityImageUploadService::deleteByUrl);
        } else {
            comment = communityCommentRepository.save(comment);
        }
        
        // 병원 태그 처리
        if (input.getDentalIds() != null) {
            log.info("[댓글 수정] dentalIds 입력값: {}", input.getDentalIds());
            List<UUID> dentalIds;
            try {
                dentalIds = parseDentalIds(input.getDentalIds());
                log.info("[댓글 수정] parseDentalIds 결과: {}", dentalIds);
            } catch (Exception e) {
                log.error("[댓글 수정] dentalIds 파싱 실패", e);
                throw new IllegalArgumentException("치과 태그 ID 변환 실패: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()), e);
            }
            // DB에서만 기존 링크 삭제 후 댓글 재로드 (clear() 사용 시 orphanRemoval로 detached instance 오류 발생 방지)
            log.info("[댓글 수정] 기존 dentalLinks 개수: {}", comment.getDentalLinks().size());
            communityCommentDentalRepository.deleteByCommentId(comment.getId());
            entityManager.flush();
            comment = communityCommentRepository.findByIdWithDentals(comment.getId()).orElse(comment);
            log.info("[댓글 수정] 기존 링크 DB 삭제 및 댓글 재로드 완료. dentalLinks 개수: {}", comment.getDentalLinks().size());

            if (dentalIds != null && !dentalIds.isEmpty()) {
                log.info("[댓글 수정] 새로운 dentalIds 처리 시작: {}", dentalIds);
                List<UUID> distinctIds = dentalIds.stream().distinct().toList();
                List<DentalEntity> existingDentals = dentalRepository.findAllById(distinctIds);
                Set<UUID> existingIds = existingDentals.stream().map(DentalEntity::getId).collect(Collectors.toSet());
                if (existingIds.size() != distinctIds.size()) {
                    throw new IllegalArgumentException(
                        "선택한 치과 중 등록되지 않은 항목이 있어요. 치과 목록을 다시 불러온 뒤 다시 선택해 주세요.");
                }
                List<CommunityCommentDentalEntity> links = new ArrayList<>();
                java.util.Map<UUID, DentalEntity> dentalMap = existingDentals.stream()
                        .collect(Collectors.toMap(DentalEntity::getId, d -> d));
                for (UUID dentalId : distinctIds) {
                    DentalEntity dental = dentalMap.get(dentalId);
                    if (dental == null) {
                        throw new IllegalArgumentException("치과를 찾을 수 없습니다: " + dentalId);
                    }
                    CommunityCommentDentalEntity link = CommunityCommentDentalEntity.builder()
                            .commentId(comment.getId())
                            .dentalId(dentalId)
                            .build();
                    link.setComment(comment);
                    link.setDental(dental);
                    links.add(link);
                }
                comment.getDentalLinks().addAll(links);
                log.info("[댓글 수정] 새로운 dentalLinks 추가 완료. 링크 개수: {}", links.size());
            } else {
                log.info("[댓글 수정] dentalIds가 비어있음 - 모든 태그 제거");
            }
            log.info("[댓글 수정] 댓글 저장 시작");
            comment = communityCommentRepository.save(comment);
            log.info("[댓글 수정] 댓글 저장 완료. ID: {}, dentalLinks 개수: {}", comment.getId(), comment.getDentalLinks() != null ? comment.getDentalLinks().size() : 0);
        }
        
        // dentalLinks(dental 포함)까지 로드해서 응답에 tags가 나오게 함
        comment = communityCommentRepository.findByIdWithDentals(comment.getId()).orElse(comment);
        UUID currentUserId = getCurrentUserIdOrNull();
        boolean isLiked = currentUserId != null && communityCommentLikeRepository.existsByUserIdAndCommentId(currentUserId, comment.getId());
        int replyCount = (int) communityCommentRepository.countByParentComment_Id(comment.getId());
        return commentToDto(comment, authorName, isLiked, replyCount);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public CommunityCommentDto toggleCommentLike(@Argument("commentId") String commentIdStr) {
        UUID userId = getCurrentUserIdOrNull();
        if (userId == null) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        UUID commentId;
        try {
            commentId = UUID.fromString(commentIdStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 댓글 ID입니다.");
        }
        var result = communityCommentService.toggleCommentLike(userId, commentId);
        CommunityCommentEntity c = result.comment();
        int replyCount = (int) communityCommentRepository.countByParentComment_Id(c.getId());
        return commentToDto(c, getCurrentUserDisplayNameOrNull(), result.isLiked(), replyCount);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public PostLikeResultDto togglePostLike(@Argument("postId") String postIdStr) {
        UUID userId = getCurrentUserIdOrNull();
        if (userId == null) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        UUID postId;
        try {
            postId = UUID.fromString(postIdStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("잘못된 게시글 ID입니다.");
        }
        return communityPostService.toggleLike(userId, postId);
    }

    /** GraphQL [ID!]는 문자열 배열로 바인딩되므로 UUID로 변환 */
    private List<UUID> parseDentalIds(List<String> raw) {
        if (raw == null || raw.isEmpty()) return Collections.emptyList();
        List<UUID> result = new ArrayList<>(raw.size());
        for (String s : raw) {
            if (s == null || s.isBlank()) continue;
            try {
                result.add(UUID.fromString(s.trim()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("잘못된 치과 ID: " + s, e);
            }
        }
        return result;
    }

    @lombok.Data
    public static class CreatePostInput {
        private String content;
        private String postType;
        /** GraphQL [ID!] → List<String>으로 바인딩 */
        private List<String> dentalIds;
        /** 이미지 URL 목록 (최대 4장) */
        private List<String> imageUrls;
    }

    @lombok.Data
    public static class CreateCommentInput {
        private String postId;
        private String content;
        private String imageUrl;
        /** GraphQL [ID!] → List<String>으로 바인딩 */
        private List<String> dentalIds;
    }

    @lombok.Data
    public static class CreateReplyInput {
        private String parentCommentId;
        private String content;
        private String imageUrl;
        private List<String> dentalIds;
    }

    @lombok.Data
    public static class UpdateCommentInput {
        private String id;
        private String content;
        private String imageUrl;
        private List<String> dentalIds;
    }
}
