package com.denticheck.api.domain.community.service.impl;

import com.denticheck.api.domain.community.service.CommunityImageUploadService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
public class CommunityImageUploadServiceImpl implements CommunityImageUploadService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    @Value("${upload.storage.local-dir:./uploads/community}")
    private String localDir;

    @Value("${upload.storage.base-url:http://localhost:8080/uploads/community}")
    private String baseUrl;

    @Override
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어 있습니다.");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("파일 이름이 없습니다.");
        }
        String ext = getExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new IllegalArgumentException("허용된 이미지 형식이 아닙니다. (jpg, jpeg, png, webp)");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("파일 크기는 5MB 이하여야 합니다.");
        }

        try {
            Path dir = Paths.get(localDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String fileName = UUID.randomUUID().toString() + ext;
            Path path = dir.resolve(fileName);
            Files.write(path, file.getBytes());

            String url = baseUrl.endsWith("/") ? baseUrl + fileName : baseUrl + "/" + fileName;
            log.debug("Community image saved: {}", url);
            return url;
        } catch (Exception e) {
            log.error("Failed to save community image", e);
            throw new RuntimeException("이미지 저장에 실패했습니다.", e);
        }
    }

    private static String getExtension(String filename) {
        int i = filename.lastIndexOf('.');
        return i > 0 ? filename.substring(i) : ".jpg";
    }

    /** 파일명만 허용 (UUID.ext 형태, 경로 조작 방지) */
    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9_.-]+\\.(jpg|jpeg|png|webp)$", Pattern.CASE_INSENSITIVE);

    @Override
    public void deleteByUrl(String url) {
        if (url == null || url.isBlank()) return;
        String fileName = null;
        try {
            int lastSlash = url.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < url.length() - 1) {
                fileName = url.substring(lastSlash + 1).split("\\?")[0];
            }
        } catch (Exception ignored) {}
        if (fileName == null || fileName.isBlank() || !SAFE_FILENAME.matcher(fileName).matches()) return;
        try {
            Path dir = Paths.get(localDir).toAbsolutePath().normalize();
            Path path = dir.resolve(fileName).normalize();
            if (!path.startsWith(dir)) return;
            if (Files.exists(path)) {
                Files.delete(path);
                log.debug("Community image deleted: {}", path);
            }
        } catch (Exception e) {
            log.warn("Failed to delete community image by url: {}", url, e);
        }
    }
}
