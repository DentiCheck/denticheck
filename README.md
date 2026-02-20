# DentiCheck: AI-Powered Dental Intelligence & Ecosystem

## 1. Inspiration
The genesis of DentiCheck lies in a critical gap in global healthcare: **oral health accessibility**. Despite the prevalence of dental diseases like caries and periodontitis, many individuals delay treatment due to "dental anxiety," high costs, or a lack of immediate awareness regarding the severity of their condition. We noticed that while general health monitoring has moved to our wrists and smartphones, oral health remains largely reactive rather than proactive.

We envisioned a world where anyone, regardless of their location or socioeconomic status, could receive a professional-quality preliminary dental screening using nothing more than their smartphone camera. Our inspiration was to turn a simple "photo of a tooth" into a sophisticated, science-backed **Dental Intelligence Report**, empowering users with knowledge before they step into a clinic.

## 2. What it does
DentiCheck is a comprehensive digital health ecosystem that transforms raw images into actionable medical intelligence.

*   **AI Vision Diagnosis**: Uses a custom-trained **YOLOv8** model to detect visual indicators of dental anomalies (cavities, tartar, gingivitis) with high precision.
*   **Intelligent Medical Analysis (RAG)**: Beyond simple detection, it uses **Retrieval-Augmented Generation** to search a curated database of dental medical literature (stored in **Milvus**) to provide context-aware, evidence-based explanations of findings.
*   **Automated Professional Reporting**: Generates a structured **PDF report** that includes visual detection markers, risk assessment (Low, Moderate, High), and a personalized care plan.
*   **Dental Ecosystem Integration**: Matches users with partner clinics (via Kakao Maps API), recommended dental products, and insurance plans tailored to their diagnosis.
*   **Enterprise Administration**: A robust management console for tracking platform adoption and managing partnerships with high-performance pagination.

## 3. How we built it (Technical Architecture)
The project is built on a high-performance, decoupled architecture with a focus on AI precision and system scalability.

### **Detailed Technology Stack**

| Layer | Component | Technologies |
| :--- | :--- | :--- |
| **Mobile App** | Interface & Logic | **Expo (React Native)**, TypeScript, React Navigation |
| **Admin Console** | Dashboard & Management | **Vite**, **React 18**, Tailwind CSS, Apollo Client |
| **Backend API** | Orchestrator | **Spring Boot 3.2**, Java 17, **GraphQL**, Spring Data JPA |
| **AI Service** | Detection & Intelligence | **Python 3.11**, **Ultralytics YOLOv8**, **FastAPI**, Kedro |
| **LLM & RAG** | Language & Knowledge | **LangChain**, **OpenAI**, **Milvus** (Vector DB), PyTorch |
| **Database** | Relational Data | **PostgreSQL 15**, Hibernate |
| **Infrastructure** | DevOps & Build | **Docker**, Docker Compose, **Gradle**, Poetry |

### **Layered Responsibilities**
*   **AI Service Layer**: Handles intensive image analysis using YOLOv8 and provides context-aware explanations via RAG. Pipeline management is handled by **Kedro**.
*   **Backend API Layer**: Acts as the central nervous system, managing business logic, security, and data orchestration between all tiers.
*   **Frontend Layer**: Provides high-performance, responsive interfaces for both consumers (Mobile) and administrators (Console).

## 4. Challenges we ran into
*   **The Hallucination Barrier**: Generative AI often provides generic or inaccurate medical advice. We solved this by implementing a strict **RAG (Retrieval-Augmented Generation)** pipeline, forcing the AI to ground every statement in verified dental literature.
*   **Visual Noise & Variability**: Mobile photos vary wildly in lighting and angle. We overcame this by implementing advanced image preprocessing and increasing the diversity of our training datasets for the YOLO model.
*   **Language Policy Enforcement**: Users often try to switch the AI's language. We had to perform deep prompt engineering at the **LlmClient** level to ensure the AI remains in "English Consultant Mode" regardless of user influence.

## 5. Accomplishments that we're proud of
*   **A "Pure" English AI Persona**: Successfully decoupling the AI's response language from the user's interface language, ensuring consistent professional standards.
*   **0-to-1 Pipeline Automation**: Achieving a fully automated flow from image capture to a downloadable, medically grounded PDF report in under 10 seconds.
*   **Scalable Architecture**: Building a system where AI models can be swapped or knowledge bases can be expanded without rewriting the backend or frontend.

## 6. What we learned
*   **Context is King**: Detection without explanation is scary; explanation without detection is vague. The synergy between **Vision AI** and **RAG-based LLM** is the "magic" of this project.
*   **Infrastructure over Models**: While the AI models are impressive, the real challenge was building the "nervous system" (API, Database, Sync Logic) that allows the models to deliver value.

## 7. What's next for DentiCheck
*   **Augmented Reality (AR) Overlay**: Real-time bounding boxes during the photo-capture phase to help users take perfect dental images.
*   **Video Scanning**: Moving from static photos to short video scans for a 360-degree dental checkup.
*   **B2B Health Records**: Integrating our PDF reports directly with hospital EMR systems for seamless treatment handovers.

---
**DentiCheck: Transforming Dental Care, One Byte at a Time.**
