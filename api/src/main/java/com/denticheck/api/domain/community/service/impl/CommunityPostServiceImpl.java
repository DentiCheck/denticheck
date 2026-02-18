package com.denticheck.api.domain.community.service.impl;

import com.denticheck.api.domain.community.dto.CommunityPostDto;
import com.denticheck.api.domain.community.dto.PostLikeResultDto;
import com.denticheck.api.domain.community.entity.CommunityPostDentalEntity;
import com.denticheck.api.domain.community.entity.CommunityPostEntity;
import com.denticheck.api.domain.community.entity.CommunityPostImageEntity;
import com.denticheck.api.domain.community.entity.CommunityPostLikeEntity;
import com.denticheck.api.domain.community.repository.CommunityPostImageRepository;
import com.denticheck.api.domain.community.repository.CommunityPostLikeRepository;
import com.denticheck.api.domain.community.repository.CommunityPostRepository;
import com.denticheck.api.domain.community.service.CommunityImageUploadService;
import com.denticheck.api.domain.community.service.CommunityPostService;
import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Collections;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommunityPostServiceImpl implements CommunityPostService {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final CommunityPostImageRepository communityPostImageRepository;
    private final CommunityImageUploadService communityImageUploadService;
    private final DentalRepository dentalRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CommunityPostDto> findAll() {
        List<CommunityPostEntity> entities = communityPostRepository.findAllWithDentals();
        if (entities.isEmpty()) return new ArrayList<>();
        List<UUID> ids = entities.stream().map(CommunityPostEntity::getId).toList();
        Map<UUID, List<String>> imagesByPostId = loadImagesByPostIds(ids);
        return entities.stream()
                .map(e -> toDto(e, null, imagesByPostId.getOrDefault(e.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommunityPostDto> findAll(int limit, int offset, String postType) {
        int safeLimit = limit <= 0 ? 10 : Math.min(limit, 50);
        int safeOffset = Math.max(0, offset);
        String normalizedType = (postType == null || postType.isEmpty() || "all".equalsIgnoreCase(postType)) ? null : postType;
        List<UUID> ids = (normalizedType == null)
                ? communityPostRepository.findIdsOrderByCreatedAtDesc(PageRequest.of(safeOffset / safeLimit, safeLimit))
                : communityPostRepository.findIdsOrderByCreatedAtDescWithPostType(PageRequest.of(safeOffset / safeLimit, safeLimit), normalizedType);
        if (ids.isEmpty()) return new ArrayList<>();
        List<CommunityPostEntity> entities = communityPostRepository.findAllWithDentalsByIdIn(ids);
        Map<UUID, List<String>> imagesByPostId = loadImagesByPostIds(ids);
        Map<UUID, Integer> order = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) order.put(ids.get(i), i);
        return entities.stream()
                .sorted(Comparator.comparingInt(e -> order.getOrDefault(e.getId(), 0)))
                .map(e -> toDto(e, null, imagesByPostId.getOrDefault(e.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CommunityPostDto> findById(UUID postId) {
        return communityPostRepository.findByIdWithDentals(postId)
                .map(e -> {
                    List<String> images = loadImagesByPostIds(List.of(postId)).getOrDefault(postId, Collections.emptyList());
                    return toDto(e, null, images);
                });
    }

    @Override
    @Transactional
    public CommunityPostDto create(String authorName, String content, String postType, List<UUID> dentalIds, List<String> imageUrls) {
        String normalizedType = (postType == null || postType.isEmpty() || "all".equalsIgnoreCase(postType)) ? null : postType;
        CommunityPostEntity entity = CommunityPostEntity.builder()
                .authorName(authorName)
                .content(content)
                .postType(normalizedType)
                .likeCount(0)
                .commentCount(0)
                .build();
        CommunityPostEntity saved = communityPostRepository.save(entity);

        List<DentalEntity> tagDentals = null;
        if (dentalIds != null && !dentalIds.isEmpty()) {
            List<UUID> distinctIds = dentalIds.stream().distinct().toList();
            List<DentalEntity> existingDentals = dentalRepository.findAllById(distinctIds);
            Set<UUID> existingIds = existingDentals.stream().map(DentalEntity::getId).collect(Collectors.toSet());
            if (existingIds.size() != distinctIds.size()) {
                throw new IllegalArgumentException(
                    "선택한 치과 중 등록되지 않은 항목이 있어요. 치과 목록을 다시 불러온 뒤 다시 선택해 주세요.");
            }
            tagDentals = existingDentals;
            List<CommunityPostDentalEntity> links = distinctIds.stream()
                    .map(dentalId -> {
                        CommunityPostDentalEntity link = CommunityPostDentalEntity.builder()
                                .postId(saved.getId())
                                .dentalId(dentalId)
                                .build();
                        link.setPost(saved);
                        return link;
                    })
                    .collect(Collectors.toList());
            saved.getDentalLinks().addAll(links);
            communityPostRepository.save(saved);
        }

        List<String> savedImageUrls = new ArrayList<>();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            int maxImages = Math.min(imageUrls.size(), 4);
            for (int i = 0; i < maxImages; i++) {
                String url = imageUrls.get(i);
                if (url == null || url.isBlank()) continue;
                CommunityPostImageEntity img = CommunityPostImageEntity.builder()
                        .post(saved)
                        .imageUrl(url.trim())
                        .sortOrder(i)
                        .build();
                saved.getImageLinks().add(img);
                savedImageUrls.add(img.getImageUrl());
            }
            communityPostRepository.save(saved);
        }

        return toDto(saved, tagDentals, savedImageUrls);
    }

    @Override
    @Transactional
    public void deleteIfAuthor(UUID postId, String authorName) {
        CommunityPostEntity post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        if (!authorName.equals(post.getAuthorName())) {
            throw new AccessDeniedException("본인 게시글만 삭제할 수 있습니다.");
        }
        List<String> imageUrls = communityPostImageRepository.findByPost_IdInOrderBySortOrderAsc(List.of(postId))
                .stream()
                .map(CommunityPostImageEntity::getImageUrl)
                .toList();
        communityPostRepository.delete(post);
        imageUrls.forEach(communityImageUploadService::deleteByUrl);
    }

    @Override
    @Transactional
    public PostLikeResultDto toggleLike(UUID userId, UUID postId) {
        CommunityPostEntity post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        boolean wasLiked = communityPostLikeRepository.existsByUserIdAndPostId(userId, postId);
        if (wasLiked) {
            communityPostLikeRepository.deleteByUserIdAndPostId(userId, postId);
            post.setLikeCount(Math.max(0, (post.getLikeCount() == null ? 0 : post.getLikeCount()) - 1));
        } else {
            communityPostLikeRepository.save(CommunityPostLikeEntity.builder()
                    .userId(userId)
                    .postId(postId)
                    .build());
            post.setLikeCount((post.getLikeCount() == null ? 0 : post.getLikeCount()) + 1);
        }
        communityPostRepository.save(post);
        return PostLikeResultDto.builder()
                .isLiked(!wasLiked)
                .likeCount(post.getLikeCount() == null ? 0 : post.getLikeCount())
                .build();
    }

    private Map<UUID, List<String>> loadImagesByPostIds(List<UUID> postIds) {
        if (postIds == null || postIds.isEmpty()) return new HashMap<>();
        List<CommunityPostImageEntity> list = communityPostImageRepository.findByPost_IdInOrderBySortOrderAsc(postIds);
        Map<UUID, List<String>> out = new HashMap<>();
        for (CommunityPostImageEntity img : list) {
            UUID postId = img.getPost().getId();
            out.computeIfAbsent(postId, k -> new ArrayList<>()).add(img.getImageUrl());
        }
        return out;
    }

    /** 태그는 entity의 dentalLinks에서 로드 (목록 조회 등) */
    private CommunityPostDto toDto(CommunityPostEntity e, List<DentalEntity> tagDentals, List<String> images) {
        String author = e.getAuthorName() != null ? e.getAuthorName() : "";
        String initial = author.isEmpty() ? "" : author.substring(0, 1);
        List<CommunityPostDto.PostTagDto> tags = new ArrayList<>();
        if (tagDentals != null && !tagDentals.isEmpty()) {
            tagDentals.forEach(dental -> tags.add(new CommunityPostDto.PostTagDto("hospital", dental.getName() != null ? dental.getName() : "", dental.getId())));
        } else if (e.getDentalLinks() != null) {
            e.getDentalLinks().stream()
                    .map(CommunityPostDentalEntity::getDental)
                    .filter(d -> d != null)
                    .forEach(dental -> tags.add(new CommunityPostDto.PostTagDto("hospital", dental.getName() != null ? dental.getName() : "", dental.getId())));
        }
        return CommunityPostDto.builder()
                .id(e.getId())
                .author(author)
                .authorInitial(initial)
                .content(e.getContent() != null ? e.getContent() : "")
                .images(images != null ? images : Collections.emptyList())
                .tags(tags)
                .likes(e.getLikeCount() != null ? e.getLikeCount() : 0)
                .comments(e.getCommentCount() != null ? e.getCommentCount() : 0)
                .createdAt(e.getCreatedAt() != null ? e.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toString() : null)
                .postType(e.getPostType())
                .build();
    }
}
