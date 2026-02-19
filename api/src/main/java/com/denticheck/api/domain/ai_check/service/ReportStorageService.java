package com.denticheck.api.domain.ai_check.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ReportStorageService {

    @Value("${report.storage.type:local}")
    private String storageType;

    @Value("${report.storage.local-dir:./reports}")
    private String localDir;

    @Value("${report.storage.base-url:http://localhost:19091/reports}")
    private String baseUrl;

    @Value("${minio.endpoint:http://localhost:9000}")
    private String minioEndpoint;

    @Value("${minio.access-key:minioadmin}")
    private String minioAccessKey;

    @Value("${minio.secret-key:minioadmin}")
    private String minioSecretKey;

    @Value("${minio.bucket:denticheck}")
    private String minioBucket;

    @Value("${minio.report-prefix:reports}")
    private String minioReportPrefix;

    public String uploadPdf(String sessionId, byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return "";
        }
        String fileStem = buildFileStem(sessionId);

        if ("minio".equalsIgnoreCase(storageType)) {
            return uploadToMinio(fileStem, pdfBytes);
        }
        return uploadToLocal(fileStem, pdfBytes);
    }

    private String uploadToLocal(String fileStem, byte[] pdfBytes) {
        try {
            Path dir = Paths.get(localDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String fileName = fileStem + ".pdf";
            Path path = dir.resolve(fileName);
            Files.write(path, pdfBytes);

            return baseUrl.endsWith("/") ? baseUrl + fileName : baseUrl + "/" + fileName;
        } catch (Exception e) {
            log.error("Failed to store PDF on local filesystem", e);
            return "";
        }
    }

    private String uploadToMinio(String fileStem, byte[] pdfBytes) {
        String objectName = minioReportPrefix + "/" + fileStem + ".pdf";
        try {
            MinioClient client = MinioClient.builder()
                    .endpoint(minioEndpoint)
                    .credentials(minioAccessKey, minioSecretKey)
                    .build();

            client.putObject(PutObjectArgs.builder()
                    .bucket(minioBucket)
                    .object(objectName)
                    .stream(new ByteArrayInputStream(pdfBytes), pdfBytes.length, -1)
                    .contentType("application/pdf")
                    .build());

            return client.getPresignedObjectUrl(io.minio.GetPresignedObjectUrlArgs.builder()
                    .bucket(minioBucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(7, TimeUnit.DAYS)
                    .build());
        } catch (Exception e) {
            log.error("Failed to upload PDF to MinIO", e);
            return "";
        }
    }

    private String buildFileStem(String sessionId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return sessionId + "-" + timestamp;
    }
}
