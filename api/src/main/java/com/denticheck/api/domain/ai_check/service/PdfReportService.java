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

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
public class PdfReportService {

    private static final float PAGE_MARGIN = 40f;
    private static final float BODY_FONT_SIZE = 10.5f;
    private static final float BODY_LEADING = 15f;
    private static final float SECTION_GAP = 16f;

    private static final Color COLOR_TEXT = new Color(33, 37, 41);
    private static final Color COLOR_MUTED = new Color(85, 91, 110);
    private static final Color COLOR_BORDER = new Color(217, 222, 230);
    private static final Color COLOR_HEADER_BG = new Color(27, 58, 114);
    private static final Color COLOR_PANEL_BG = new Color(246, 248, 251);
    private static final Color COLOR_TABLE_HEADER_BG = new Color(239, 244, 252);

    public byte[] generate(
            String sessionId,
            AiCheckRunResponse.LlmResult llmResult,
            List<AiCheckRunResponse.DetectionItem> detections
    ) {
        PdfViewModel view = toLegacyView(llmResult, detections);
        return generateAnalyzeReport(sessionId, view, detections);
    }

    public byte[] generateAnalyzeReport(String sessionId, PdfViewModel viewModel) {
        return generateAnalyzeReport(sessionId, viewModel, List.of());
    }

    public byte[] generateAnalyzeReport(
            String sessionId,
            PdfViewModel viewModel,
            List<AiCheckRunResponse.DetectionItem> detections
    ) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDFont bodyFont = resolveKoreanFont(document);
            PDFont boldFont = bodyFont;
            PDFont fallbackBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            float pageWidth = page.getMediaBox().getWidth();
            float contentWidth = pageWidth - (PAGE_MARGIN * 2);
            float y = page.getMediaBox().getHeight() - PAGE_MARGIN;

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                y = drawHeader(content, boldFont, bodyFont, fallbackBold, sessionId, contentWidth, y);
                y -= SECTION_GAP;

                y = drawRiskSummary(content, boldFont, bodyFont, fallbackBold, viewModel, contentWidth, y);
                y -= SECTION_GAP;

                y = drawDetectionTable(content, boldFont, bodyFont, fallbackBold, detections, contentWidth, y);
                y -= SECTION_GAP;

                y = drawProblemSection(content, boldFont, bodyFont, fallbackBold, viewModel, contentWidth, y);
                y -= SECTION_GAP;

                y = drawActionSection(content, boldFont, bodyFont, fallbackBold, viewModel, contentWidth, y);
                y -= SECTION_GAP;

                y = drawVisitSection(content, boldFont, bodyFont, fallbackBold, viewModel, contentWidth, y);
                y -= SECTION_GAP;

                drawFooter(content, bodyFont, fallbackBold, y, contentWidth);
            }

            document.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate analyze PDF report", e);
            return new byte[0];
        }
    }

    private float drawHeader(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            String sessionId,
            float contentWidth,
            float y
    ) throws Exception {
        float cardHeight = 78f;
        drawRect(content, PAGE_MARGIN, y - cardHeight, contentWidth, cardHeight, COLOR_HEADER_BG, null);

        y = writeLine(content, boldFont, fallbackBold, 18f, "DentiCheck AI Dental Report", PAGE_MARGIN + 14f, y - 26f, Color.WHITE);

        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        y = writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, "Generated: " + generatedAt, PAGE_MARGIN + 14f, y - 8f, new Color(231, 237, 247));
        if (sessionId != null && !sessionId.isBlank()) {
            writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, "Session ID: " + sessionId, PAGE_MARGIN + 14f, y - 6f, new Color(231, 237, 247));
        }
        return y - 22f;
    }

    private float drawRiskSummary(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            PdfViewModel viewModel,
            float contentWidth,
            float y
    ) throws Exception {
        String riskLevel = valueOrDefault(viewModel, v -> v.getRiskSummary() == null ? null : v.getRiskSummary().getLevelText(), "LOW");
        String oneLineSummary = valueOrDefault(viewModel, v -> v.getRiskSummary() == null ? null : v.getRiskSummary().getOneLineSummary(),
                "No critical finding detected. Maintain regular oral care and periodic checkups.");

        float cardHeight = 96f;
        drawRect(content, PAGE_MARGIN, y - cardHeight, contentWidth, cardHeight, COLOR_PANEL_BG, COLOR_BORDER);

        writeLine(content, boldFont, fallbackBold, 13f, "Risk Summary", PAGE_MARGIN + 12f, y - 20f, COLOR_TEXT);

        Color riskColor = colorByRisk(riskLevel);
        drawRect(content, PAGE_MARGIN + 12f, y - 44f, 92f, 20f, riskColor, null);
        writeLine(content, boldFont, fallbackBold, 10f, normalizeRiskLabel(riskLevel), PAGE_MARGIN + 20f, y - 39f, Color.WHITE);

        return writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE, oneLineSummary,
                PAGE_MARGIN + 12f, y - 62f, contentWidth - 24f, COLOR_MUTED);
    }

    private float drawDetectionTable(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            List<AiCheckRunResponse.DetectionItem> detections,
            float contentWidth,
            float y
    ) throws Exception {
        float tableTop = y;
        float headerHeight = 20f;
        float rowHeight = 18f;

        writeLine(content, boldFont, fallbackBold, 13f, "Detection Results", PAGE_MARGIN, y - 2f, COLOR_TEXT);
        y -= 18f;

        float xLabel = PAGE_MARGIN;
        float xConfidence = PAGE_MARGIN + 145f;
        float xBbox = PAGE_MARGIN + 255f;

        drawRect(content, PAGE_MARGIN, y - headerHeight, contentWidth, headerHeight, COLOR_TABLE_HEADER_BG, COLOR_BORDER);
        writeLine(content, boldFont, fallbackBold, 10f, "Label", xLabel + 8f, y - 14f, COLOR_TEXT);
        writeLine(content, boldFont, fallbackBold, 10f, "Confidence", xConfidence + 8f, y - 14f, COLOR_TEXT);
        writeLine(content, boldFont, fallbackBold, 10f, "BBox (x,y,w,h)", xBbox + 8f, y - 14f, COLOR_TEXT);
        y -= headerHeight;

        List<AiCheckRunResponse.DetectionItem> rows = detections == null ? List.of() : detections;
        if (rows.isEmpty()) {
            drawRect(content, PAGE_MARGIN, y - rowHeight, contentWidth, rowHeight, Color.WHITE, COLOR_BORDER);
            writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, "No detected objects", PAGE_MARGIN + 8f, y - 13f, COLOR_MUTED);
            y -= rowHeight;
        } else {
            int maxRows = Math.min(rows.size(), 6);
            for (int i = 0; i < maxRows; i++) {
                AiCheckRunResponse.DetectionItem row = rows.get(i);
                Color rowBg = i % 2 == 0 ? Color.WHITE : new Color(250, 251, 253);
                drawRect(content, PAGE_MARGIN, y - rowHeight, contentWidth, rowHeight, rowBg, COLOR_BORDER);

                String label = nullToEmpty(row.getLabel()).toUpperCase(Locale.ROOT);
                String confidence = String.format(Locale.ROOT, "%.1f%%", row.getConfidence() * 100f);
                String bbox = formatBbox(row.getBbox());

                writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, label, xLabel + 8f, y - 13f, COLOR_TEXT);
                writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, confidence, xConfidence + 8f, y - 13f, COLOR_TEXT);
                writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE, bbox, xBbox + 8f, y - 13f, COLOR_MUTED);
                y -= rowHeight;
            }

            if (rows.size() > 6) {
                drawRect(content, PAGE_MARGIN, y - rowHeight, contentWidth, rowHeight, Color.WHITE, COLOR_BORDER);
                writeLine(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                        "+ " + (rows.size() - 6) + " more item(s)", PAGE_MARGIN + 8f, y - 13f, COLOR_MUTED);
                y -= rowHeight;
            }
        }

        return Math.min(y, tableTop - 40f);
    }

    private float drawProblemSection(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            PdfViewModel viewModel,
            float contentWidth,
            float y
    ) throws Exception {
        writeLine(content, boldFont, fallbackBold, 13f, "Key Findings", PAGE_MARGIN, y - 2f, COLOR_TEXT);
        y -= 18f;

        List<PdfViewModel.Problem> problems = viewModel == null || viewModel.getProblems() == null ? List.of() : viewModel.getProblems();
        if (problems.isEmpty()) {
            drawRect(content, PAGE_MARGIN, y - 42f, contentWidth, 42f, COLOR_PANEL_BG, COLOR_BORDER);
            return writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                    "No major issue summary was provided.", PAGE_MARGIN + 10f, y - 16f, contentWidth - 20f, COLOR_MUTED);
        }

        int maxRows = Math.min(problems.size(), 3);
        for (int i = 0; i < maxRows; i++) {
            PdfViewModel.Problem p = problems.get(i);
            float cardHeight = 56f;
            drawRect(content, PAGE_MARGIN, y - cardHeight, contentWidth, cardHeight, COLOR_PANEL_BG, COLOR_BORDER);
            writeLine(content, boldFont, fallbackBold, BODY_FONT_SIZE, "Issue " + (i + 1) + ": " + nullToEmpty(p.getTitle()), PAGE_MARGIN + 10f, y - 16f, COLOR_TEXT);
            y = writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                    "Reason: " + nullToEmpty(p.getReason()), PAGE_MARGIN + 10f, y - 31f, contentWidth - 20f, COLOR_MUTED);
            y = writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                    "Action: " + nullToEmpty(p.getAction()), PAGE_MARGIN + 10f, y - 4f, contentWidth - 20f, COLOR_MUTED);
            y -= 8f;
        }

        return y;
    }

    private float drawActionSection(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            PdfViewModel viewModel,
            float contentWidth,
            float y
    ) throws Exception {
        writeLine(content, boldFont, fallbackBold, 13f, "Recommended Care", PAGE_MARGIN, y - 2f, COLOR_TEXT);
        y -= 18f;

        List<String> actions = viewModel == null || viewModel.getActions() == null ? List.of() : viewModel.getActions();
        if (actions.isEmpty()) {
            return writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                    "Maintain daily oral care and schedule regular checkups.", PAGE_MARGIN, y - 2f, contentWidth, COLOR_MUTED);
        }

        int maxRows = Math.min(actions.size(), 4);
        for (int i = 0; i < maxRows; i++) {
            y = writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                    (i + 1) + ". " + actions.get(i), PAGE_MARGIN, y - 2f, contentWidth, COLOR_MUTED);
        }
        return y;
    }

    private float drawVisitSection(
            PDPageContentStream content,
            PDFont boldFont,
            PDFont bodyFont,
            PDFont fallbackBold,
            PdfViewModel viewModel,
            float contentWidth,
            float y
    ) throws Exception {
        String visitLevel = valueOrDefault(viewModel, v -> v.getVisit() == null ? null : v.getVisit().getLevel(), "Observe");
        String visitReason = valueOrDefault(viewModel, v -> v.getVisit() == null ? null : v.getVisit().getReason(),
                "If symptoms persist or worsen, consult a dentist promptly.");

        float cardHeight = 58f;
        drawRect(content, PAGE_MARGIN, y - cardHeight, contentWidth, cardHeight, COLOR_PANEL_BG, COLOR_BORDER);

        writeLine(content, boldFont, fallbackBold, 12f, "Clinic Visit Guidance", PAGE_MARGIN + 10f, y - 16f, COLOR_TEXT);
        writeLine(content, boldFont, fallbackBold, BODY_FONT_SIZE, "Need: " + visitLevel, PAGE_MARGIN + 10f, y - 32f, COLOR_TEXT);
        return writeWrapped(content, bodyFont, fallbackBold, BODY_FONT_SIZE,
                "Reason: " + visitReason, PAGE_MARGIN + 10f, y - 46f, contentWidth - 20f, COLOR_MUTED);
    }

    private void drawFooter(
            PDPageContentStream content,
            PDFont bodyFont,
            PDFont fallbackBold,
            float y,
            float contentWidth
    ) throws Exception {
        float footerY = Math.max(y, PAGE_MARGIN + 30f);
        drawRect(content, PAGE_MARGIN, footerY - 26f, contentWidth, 26f, new Color(250, 250, 250), COLOR_BORDER);
        writeLine(content, bodyFont, fallbackBold, 9f,
                "This report is for guidance only and does not replace professional diagnosis.",
                PAGE_MARGIN + 8f, footerY - 16f, COLOR_MUTED);
    }

    private void drawRect(
            PDPageContentStream content,
            float x,
            float y,
            float width,
            float height,
            Color fill,
            Color stroke
    ) throws Exception {
        if (fill != null) {
            content.setNonStrokingColor(fill);
            content.addRect(x, y, width, height);
            content.fill();
        }
        if (stroke != null) {
            content.setStrokingColor(stroke);
            content.addRect(x, y, width, height);
            content.stroke();
        }
    }

    private float writeLine(
            PDPageContentStream content,
            PDFont font,
            PDFont fallbackFont,
            float fontSize,
            String text,
            float x,
            float y,
            Color color
    ) throws Exception {
        content.beginText();
        content.setFont(font == null ? fallbackFont : font, fontSize);
        content.setNonStrokingColor(color == null ? COLOR_TEXT : color);
        content.newLineAtOffset(x, y);
        content.showText(nullToEmpty(text));
        content.endText();
        return y;
    }

    private float writeWrapped(
            PDPageContentStream content,
            PDFont font,
            PDFont fallbackFont,
            float fontSize,
            String text,
            float x,
            float y,
            float maxWidth,
            Color color
    ) throws Exception {
        List<String> lines = wrapLines(font, fontSize, nullToEmpty(text), maxWidth);
        float currentY = y;
        if (lines.isEmpty()) {
            return currentY - BODY_LEADING;
        }

        for (String line : lines) {
            writeLine(content, font, fallbackFont, fontSize, line, x, currentY, color);
            currentY -= BODY_LEADING;
            if (currentY < PAGE_MARGIN + BODY_LEADING) {
                break;
            }
        }

        return currentY;
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
            String candidate = chunk + String.valueOf(c);
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

    private Color colorByRisk(String riskLevel) {
        String normalized = nullToEmpty(riskLevel).toUpperCase(Locale.ROOT);
        if (normalized.contains("RED") || normalized.contains("HIGH")) {
            return new Color(205, 49, 49);
        }
        if (normalized.contains("YELLOW") || normalized.contains("MEDIUM")) {
            return new Color(205, 132, 36);
        }
        return new Color(42, 129, 87);
    }

    private String normalizeRiskLabel(String riskLevel) {
        String normalized = nullToEmpty(riskLevel).toUpperCase(Locale.ROOT);
        if (normalized.contains("RED") || normalized.contains("HIGH")) {
            return "HIGH";
        }
        if (normalized.contains("YELLOW") || normalized.contains("MEDIUM")) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String formatBbox(AiCheckRunResponse.BBox bbox) {
        if (bbox == null) {
            return "-";
        }
        return String.format(Locale.ROOT, "%.2f, %.2f, %.2f, %.2f", bbox.getX(), bbox.getY(), bbox.getW(), bbox.getH());
    }

    private PdfViewModel toLegacyView(AiCheckRunResponse.LlmResult llmResult, List<AiCheckRunResponse.DetectionItem> detections) {
        String riskLevel = "LOW";
        String summary = "No critical finding detected. Maintain regular oral care and periodic checkups.";

        if (llmResult != null && llmResult.getOverall() != null) {
            String level = llmResult.getOverall().getLevel();
            if ("RED".equalsIgnoreCase(level)) {
                riskLevel = "HIGH";
            } else if ("YELLOW".equalsIgnoreCase(level)) {
                riskLevel = "MEDIUM";
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
                        .reason("A detailed review is recommended for this finding.")
                        .action("Visit a dental clinic for precise assessment and guidance.")
                        .build());
                if (problems.size() >= 3) {
                    break;
                }
            }
        }

        List<String> actions = List.of(
                "Brush gently for 2 minutes, 2-3 times per day.",
                "Use interdental cleaners or floss once daily.",
                "Limit sugary snacks and rinse with water after meals.",
                "Book a routine dental checkup within 1-2 weeks."
        );

        return PdfViewModel.builder()
                .riskSummary(PdfViewModel.RiskSummary.builder()
                        .levelText(riskLevel)
                        .oneLineSummary(summary)
                        .build())
                .problems(problems)
                .actions(actions)
                .visit(PdfViewModel.Visit.builder()
                        .level("Recommended")
                        .reason("Professional confirmation is recommended when symptoms continue.")
                        .build())
                .build();
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
