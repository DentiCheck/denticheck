package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.denticheck.api.domain.ai_check.dto.PdfViewModel;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class PdfReportService {

    private static final float PAGE_MARGIN = 50f;
    private static final float BODY_FONT_SIZE = 11f;
    private static final float BODY_LEADING = 17f;
    private static final float SECTION_GAP = 10f;

    public byte[] generate(
            String sessionId,
            AiCheckRunResponse.LlmResult llmResult,
            List<AiCheckRunResponse.DetectionItem> detections
    ) {
        PdfViewModel view = toLegacyView(llmResult, detections);
        return generateAnalyzeReport(sessionId, view);
    }

    public byte[] generateAnalyzeReport(String sessionId, PdfViewModel viewModel) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDFont bodyFont = resolveKoreanFont(document);
            PDFont boldFont = bodyFont;
            PDFont fallbackBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            float y = page.getMediaBox().getHeight() - PAGE_MARGIN;

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                y = writeWrapped(content, page, boldFont, fallbackBold, 16f, "DentiCheck AI 분석 리포트", y, true);
                y -= 8f;

                String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "생성일시: " + generatedAt, y, false);
                if (sessionId != null && !sessionId.isBlank()) {
                    y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "세션 ID: " + sessionId, y, false);
                }

                y -= SECTION_GAP;
                y = writeSectionTitle(content, page, boldFont, fallbackBold, "위험도 요약", y);
                String riskLevel = valueOrDefault(viewModel, v -> v.getRiskSummary() == null ? null : v.getRiskSummary().getLevelText(), "낮음(초록)");
                String oneLineSummary = valueOrDefault(viewModel, v -> v.getRiskSummary() == null ? null : v.getRiskSummary().getOneLineSummary(), "큰 이상 신호는 적어 보이지만 정기 검진은 유지하세요.");
                y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "위험도: " + riskLevel, y, false);
                y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, oneLineSummary, y, false);

                y -= SECTION_GAP;
                y = writeSectionTitle(content, page, boldFont, fallbackBold, "발견된 문제", y);
                List<PdfViewModel.Problem> problems = viewModel == null || viewModel.getProblems() == null ? List.of() : viewModel.getProblems();
                if (problems.isEmpty()) {
                    y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "뚜렷한 이상 문제는 크지 않아 보입니다.", y, false);
                } else {
                    for (int i = 0; i < problems.size() && i < 3; i++) {
                        PdfViewModel.Problem problem = problems.get(i);
                        y = writeWrapped(content, page, boldFont, fallbackBold, BODY_FONT_SIZE, "문제 " + (i + 1) + ": " + nullToEmpty(problem.getTitle()), y, false);
                        y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "왜 문제인지: " + nullToEmpty(problem.getReason()), y, false);
                        y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "지금 해야 할 행동: " + nullToEmpty(problem.getAction()), y, false);
                        y -= 4f;
                    }
                }

                y -= SECTION_GAP;
                y = writeSectionTitle(content, page, boldFont, fallbackBold, "지금 해야 할 것", y);
                List<String> actions = viewModel == null || viewModel.getActions() == null ? List.of() : viewModel.getActions();
                if (actions.isEmpty()) {
                    y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "오늘부터 규칙적인 구강 관리를 유지하세요.", y, false);
                } else {
                    for (int i = 0; i < actions.size() && i < 4; i++) {
                        y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, (i + 1) + ". " + actions.get(i), y, false);
                    }
                }

                y -= SECTION_GAP;
                y = writeSectionTitle(content, page, boldFont, fallbackBold, "병원 방문 필요 여부", y);
                String visitLevel = valueOrDefault(viewModel, v -> v.getVisit() == null ? null : v.getVisit().getLevel(), "관찰");
                String visitReason = valueOrDefault(viewModel, v -> v.getVisit() == null ? null : v.getVisit().getReason(), "정기 검진을 유지하며 상태를 관찰하세요.");
                y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "방문 수준: " + visitLevel, y, false);
                y = writeWrapped(content, page, bodyFont, fallbackBold, BODY_FONT_SIZE, "이유: " + visitReason, y, false);

                y -= SECTION_GAP + 4f;
                y = writeWrapped(content, page, bodyFont, fallbackBold, 10f, "이 리포트는 진단이 아닌 참고용입니다.", y, false);
                writeWrapped(content, page, bodyFont, fallbackBold, 10f, "증상이 있거나 불편하면 치과 진료를 받아 주세요.", y, false);
            }

            document.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate analyze PDF report", e);
            return new byte[0];
        }
    }

    private PdfViewModel toLegacyView(AiCheckRunResponse.LlmResult llmResult, List<AiCheckRunResponse.DetectionItem> detections) {
        String riskLevel = "낮음(초록)";
        String summary = "큰 이상 신호는 적어 보이지만 정기 검진은 유지하세요.";

        if (llmResult != null && llmResult.getOverall() != null) {
            String level = llmResult.getOverall().getLevel();
            if ("RED".equalsIgnoreCase(level)) {
                riskLevel = "높음(빨강)";
            } else if ("YELLOW".equalsIgnoreCase(level)) {
                riskLevel = "보통(노랑)";
            }
            if (llmResult.getOverall().getOneLineSummary() != null && !llmResult.getOverall().getOneLineSummary().isBlank()) {
                summary = llmResult.getOverall().getOneLineSummary();
            }
        }

        List<PdfViewModel.Problem> problems = new ArrayList<>();
        if (llmResult != null && llmResult.getFindings() != null) {
            for (AiCheckRunResponse.Finding finding : llmResult.getFindings()) {
                if (finding == null) {
                    continue;
                }
                problems.add(PdfViewModel.Problem.builder()
                        .title(nullToEmpty(finding.getTitle()))
                        .reason("확인이 필요한 부위가 보입니다.")
                        .action("무리한 자가 판단보다 치과 검진으로 확인하세요.")
                        .build());
                if (problems.size() >= 3) {
                    break;
                }
            }
        }

        List<String> actions = List.of(
                "오늘부터 하루 2~3회, 2분씩 부드럽게 양치하세요.",
                "자기 전 치실을 1회 사용하고, 사용 후 물로 헹구세요.",
                "단 음식은 식사 시간에만 먹고, 먹은 뒤 물을 마시세요.",
                "1주 안에 치과 검진 예약을 잡으세요."
        );

        return PdfViewModel.builder()
                .riskSummary(PdfViewModel.RiskSummary.builder()
                        .levelText(riskLevel)
                        .oneLineSummary(summary)
                        .build())
                .problems(problems)
                .actions(actions)
                .visit(PdfViewModel.Visit.builder()
                        .level("권장")
                        .reason("확인이 필요한 부위가 있다면 가까운 시일 내 검진이 좋습니다.")
                        .build())
                .build();
    }

    private float writeSectionTitle(
            PDPageContentStream content,
            PDPage page,
            PDFont boldFont,
            PDFont fallbackBold,
            String title,
            float y
    ) throws Exception {
        return writeWrapped(content, page, boldFont, fallbackBold, 13f, title, y, true);
    }

    private float writeWrapped(
            PDPageContentStream content,
            PDPage page,
            PDFont font,
            PDFont fallbackFont,
            float fontSize,
            String text,
            float y,
            boolean boldFallback
    ) throws Exception {
        String safeText = nullToEmpty(text);
        float width = page.getMediaBox().getWidth() - (PAGE_MARGIN * 2);
        List<String> lines = wrapLines(font, fontSize, safeText, width);

        for (String line : lines) {
            if (y < PAGE_MARGIN + BODY_LEADING) {
                break;
            }
            content.beginText();
            content.setFont(font, fontSize);
            content.newLineAtOffset(PAGE_MARGIN, y);
            content.showText(line);
            content.endText();
            y -= BODY_LEADING;
        }

        if (lines.isEmpty()) {
            content.beginText();
            content.setFont(boldFallback ? fallbackFont : font, fontSize);
            content.newLineAtOffset(PAGE_MARGIN, y);
            content.showText("");
            content.endText();
            y -= BODY_LEADING;
        }

        return y;
    }

    private List<String> wrapLines(PDFont font, float fontSize, String text, float maxWidth) throws Exception {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return lines;
        }

        String[] words = text.split("\\s+");
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            float candidateWidth = font.getStringWidth(candidate) / 1000f * fontSize;
            if (candidateWidth <= maxWidth) {
                current.setLength(0);
                current.append(candidate);
                continue;
            }

            if (!current.isEmpty()) {
                lines.add(current.toString());
                current.setLength(0);
            }

            if (font.getStringWidth(word) / 1000f * fontSize <= maxWidth) {
                current.append(word);
            } else {
                lines.addAll(splitLongWord(font, fontSize, word, maxWidth));
            }
        }

        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    private List<String> splitLongWord(PDFont font, float fontSize, String word, float maxWidth) throws Exception {
        List<String> out = new ArrayList<>();
        StringBuilder chunk = new StringBuilder();
        for (char c : word.toCharArray()) {
            String candidate = chunk.toString() + c;
            float candidateWidth = font.getStringWidth(candidate) / 1000f * fontSize;
            if (candidateWidth <= maxWidth) {
                chunk.append(c);
            } else {
                if (!chunk.isEmpty()) {
                    out.add(chunk.toString());
                    chunk.setLength(0);
                }
                chunk.append(c);
            }
        }
        if (!chunk.isEmpty()) {
            out.add(chunk.toString());
        }
        return out;
    }

    private PDFont resolveKoreanFont(PDDocument document) {
        try {
            ClassPathResource resource = new ClassPathResource("fonts/malgun.ttf");
            if (resource.exists()) {
                try (InputStream input = resource.getInputStream()) {
                    return PDType0Font.load(document, input, true);
                }
            }

            File windowsFont = new File("C:/Windows/Fonts/malgun.ttf");
            if (windowsFont.exists()) {
                return PDType0Font.load(document, windowsFont);
            }
        } catch (Exception e) {
            log.warn("Korean font loading failed. Fallback font will be used", e);
        }

        return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String valueOrDefault(PdfViewModel view, ValueExtractor extractor, String fallback) {
        if (view == null) {
            return fallback;
        }
        String value = extractor.get(view);
        return value == null || value.isBlank() ? fallback : value;
    }

    @FunctionalInterface
    private interface ValueExtractor {
        String get(PdfViewModel viewModel);
    }
}
