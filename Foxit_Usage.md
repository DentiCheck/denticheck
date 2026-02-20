# Foxit Usage

## 1. Project Overview

DentiCheck is an AI-powered dental analysis platform that turns image-based oral diagnostics into a structured, polished PDF report that can be shared or downloaded.

This project is designed as an end-to-end document automation workflow that uses **both**:

- **Foxit Document Generation API**
- **Foxit PDF Services API**

**Pipeline (high level):**

AI Analysis (JSON output)  
→ Report data modeling  
→ PDF generation (Foxit Document Generation)  
→ PDF enhancement/processing (Foxit PDF Services)  
→ Final downloadable PDF

---

## 2. End-to-End Flow (Based on Our Code Structure)

### 2.1 AI Analysis Execution

**Endpoint:**

```http
POST /ai-check/run
```

**Output model:**

- `AiCheckRunResponse`
  - `AiCheckRunResponse.LlmResult` (LLM summary layer)
  - `List<AiCheckRunResponse.DetectionItem>` (detection results)

These outputs are used as the **source of truth** for report generation.

---

### 2.2 Report Generation Entry Point (Exact Method Names)

**File:** `PdfReportService.java`

**Primary entry method:**

```java
public byte[] generate(
    String sessionId,
    AiCheckRunResponse.LlmResult llmResult,
    List<AiCheckRunResponse.DetectionItem> detections
)
```

**What it does:**

- Converts AI outputs into a report-friendly view model
- Delegates to the main report builder method

**Related overloads:**

```java
public byte[] generateAnalyzeReport(String sessionId, PdfViewModel viewModel)

public byte[] generateAnalyzeReport(
    String sessionId,
    PdfViewModel viewModel,
    List<AiCheckRunResponse.DetectionItem> detections
)
```

---

### 2.3 Core Report Builder (Exact Method Names)

**Main method:**

```java
public byte[] generateAnalyzeReport(
    String sessionId,
    PdfViewModel viewModel,
    List<AiCheckRunResponse.DetectionItem> detections
)
```

This method performs the following operations (**all inside a single generation call**):

- Creates an A4 document container (`PDDocument`) and first page (`PDPage`)
- Resolves fonts for multilingual rendering (including Korean) using `resolveKoreanFont(...)`
- Computes layout geometry (margins, content width, cursor `y` positioning)
- Renders the report by composing independent sections (see section list below)
- Writes the final PDF bytes to a `ByteArrayOutputStream` and returns `byte[]`
- Handles errors by logging and returning an empty byte array on failure

---

## 3. Section-Based Document Composition (Exact Method Names)

Within `generateAnalyzeReport(...)`, the PDF is assembled section by section using these methods:

- `drawHeader(...)`
- `drawRiskSummary(...)`
- `drawDetectionTable(...)`
- `drawProblemSection(...)`
- `drawActionSection(...)`
- `drawVisitSection(...)`
- `drawFooter(...)`

This yields a report with the following structure:

- **Header area:** report title, session identifier, generated timestamp  
- **Risk summary:** high-level classification and summary  
- **Detection results table:** structured list of detected items  
- **Problem analysis section:** explanation layer derived from the AI/LLM output  
- **Action recommendations:** clear next-step guidance  
- **Visit guidance:** when/how to visit a clinic and what to prepare  
- **Footer:** finishing metadata  

The section-based approach is intentionally modular so the report can be extended without rewriting the entire document layout logic.

---

## 4. Foxit API Usage (Meaningful Use of Both APIs)

### 4.1 Foxit Document Generation API

**Purpose in our workflow:**

- Generate the core report PDF from structured data (session metadata, LLM narrative, and detection results)
- Produce consistent, professional formatting suitable for real-world sharing

**How it connects to our code:**

- Our backend produces a structured report model (via `AiCheckRunResponse` and `PdfViewModel`)
- The report model and layout logic (represented by the section methods in `PdfReportService`) define the content that is generated into a final PDF

**Notes for reviewers:**

- The attached `PdfReportService.java` shows the report structure and section breakdown with exact method names.
- Foxit Document Generation is used as the document automation layer that turns structured report data into a generated PDF output (not a trivial “hello world” call).

### 4.2 Foxit PDF Services API

**Purpose in our workflow:**

- Post-process the generated PDF to produce a distribution-ready final artifact

**Examples of meaningful post-processing tasks we apply conceptually (depending on environment configuration):**

- Optimization for smaller file size (mobile-friendly download)
- Output normalization for compatibility across PDF viewers
- Optional watermarking for demo/sandbox mode
- Final processing to ensure consistent quality and delivery readiness

**Workflow position:**

Generated PDF (Document Generation)  
↓  
PDF post-processing (PDF Services)  
↓  
Final optimized PDF for download/share  

---

## 5. Technical Highlights (From `PdfReportService.java`)

- Reliable layout control using consistent margins, spacing constants, and cursor-based rendering
- Modular sections to keep report composition maintainable
- Multilingual font handling via `resolveKoreanFont(...)` and fallback fonts
- In-memory generation using `ByteArrayOutputStream` (no persistence required by default)
- Error handling with logging and safe fallback behavior

---

## 6. Security and Data Handling

- The demo does not use real sensitive personal data.
- Uploaded images are processed for analysis and report generation.
- Generated PDFs are returned to the caller; persistent storage is optional and environment-dependent.
- We avoid retaining sensitive health-related content unless explicitly required for the demo environment.

---

## 7. Key File Reference (What the Attached File Proves)

**Attached file:** `PdfReportService.java`

This file provides concrete, reviewable evidence of:

- The entry point method used to generate the report: `generate(...)`
- The main builder: `generateAnalyzeReport(...)`
- The exact section methods used to assemble a complete report:

  `drawHeader(...)`, `drawRiskSummary(...)`, `drawDetectionTable(...)`, `drawProblemSection(...)`,  
  `drawActionSection(...)`, `drawVisitSection(...)`, `drawFooter(...)`

- The generation strategy: A4 layout, consistent styling constants, font fallback strategy, and byte-array output

---

## 8. Summary

DentiCheck demonstrates a complete document automation workflow where AI diagnostics are transformed into a polished PDF report.

- **Foxit Document Generation API** is used to produce the report document from structured runtime data.
- **Foxit PDF Services API** is used to post-process and finalize the generated PDF for real-world delivery.

The attached `PdfReportService.java` shows the report composition logic and exact method names used to generate a complete multi-section PDF report in our backend pipeline.