package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class PdfReportService {

    public byte[] generate(
            String sessionId,
            AiCheckRunResponse.LlmResult llmResult,
            List<AiCheckRunResponse.DetectionItem> detections) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float x = 50;
                float y = 790;
                float leading = 18;

                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                content.newLineAtOffset(x, y);
                content.showText("DentiCheck AI Screening Report");
                content.endText();

                y -= leading * 2;
                y = writeLine(content, x, y, "Session ID: " + sessionId, true);
                y = writeLine(content, x, y,
                        "Generated At: " + OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME), false);
                y = writeLine(content, x, y, "", false);

                if (llmResult != null && llmResult.getOverall() != null) {
                    y = writeLine(content, x, y, "Risk Level: " + llmResult.getOverall().getLevel(), true);
                    y = writeLine(content, x, y, "Badge: " + llmResult.getOverall().getBadgeText(), false);
                    y = writeLine(content, x, y, "Summary: " + llmResult.getOverall().getOneLineSummary(), false);
                }

                y = writeLine(content, x, y - 8, "", false);
                y = writeLine(content, x, y, "Findings:", true);

                if (llmResult != null && llmResult.getFindings() != null && !llmResult.getFindings().isEmpty()) {
                    for (AiCheckRunResponse.Finding finding : llmResult.getFindings()) {
                        y = writeLine(content, x, y, "- " + finding.getTitle() + " / " + finding.getSeverity() + " / "
                                + finding.getLocationText(), false);
                    }
                } else {
                    y = writeLine(content, x, y, "- No findings", false);
                }

                y = writeLine(content, x, y - 8, "", false);
                y = writeLine(content, x, y, "Detections:", true);
                if (detections != null && !detections.isEmpty()) {
                    for (AiCheckRunResponse.DetectionItem d : detections) {
                        y = writeLine(content, x, y,
                                "- " + d.getLabel() + " conf="
                                        + String.format("%.3f", d.getConfidence() == null ? 0.0 : d.getConfidence()),
                                false);
                    }
                } else {
                    y = writeLine(content, x, y, "- No detections", false);
                }

                y = writeLine(content, x, y - 8, "", false);
                y = writeLine(content, x, y, "Care Guide:", true);
                if (llmResult != null && llmResult.getCareGuide() != null) {
                    for (String guide : llmResult.getCareGuide()) {
                        y = writeLine(content, x, y, "- " + guide, false);
                    }
                }

                y = writeLine(content, x, y - 8, "", false);
                y = writeLine(content, x, y, "Disclaimer:", true);
                y = writeLine(content, x, y, "- This report is AI screening reference only, not a medical diagnosis.",
                        false);
                y = writeLine(content, x, y, "- Visit a dentist for clinical confirmation.", false);
            }

            document.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF report", e);
            return new byte[0];
        }
    }

    private float writeLine(PDPageContentStream content, float x, float y, String text, boolean bold) throws Exception {
        content.beginText();
        content.setFont(
                new PDType1Font(bold ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA),
                11);
        content.newLineAtOffset(x, y);
        content.showText(safeAscii(text));
        content.endText();
        return y - 15;
    }

    private String safeAscii(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            sb.append(c <= 127 ? c : '?');
        }
        return sb.toString();
    }
}
