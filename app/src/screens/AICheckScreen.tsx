import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Camera, ImagePlus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../shared/components/ui/Button";
import { useAuth } from "../shared/providers/AuthProvider";

type BBox = { x: number; y: number; w: number; h: number };
type Detection = { label: "caries" | "tartar" | "oral_cancer" | "normal"; confidence: number; bbox: BBox };

type QuickResponse = {
  sessionId: string;
  status: "quality_failed" | "done" | "error";
  detections: Detection[];
};

type AnalyzeRagSource = { source: string; score: number; snippet: string };
type AnalyzeFinding = { title: string; detail: string; evidence: string[] };
type AnalyzeResponse = {
  sessionId: string;
  status: string;
  pdfUrl?: string;
  detections: Detection[];
  rag: {
    topK: number;
    sources: AnalyzeRagSource[];
    usedFallback: boolean;
  };
  llmResult: {
    riskLevel: "GREEN" | "YELLOW" | "RED";
    summary: string;
    findings: AnalyzeFinding[];
    careGuide: string[];
    disclaimer: string[];
  };
};

type SelectedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

type RiskUi = {
  text: string;
  badgeClassName: string;
};

type ProblemCard = {
  title: string;
  reason: string;
  action: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_SERVER_URL;
const QUICK_REQUEST_TIMEOUT_MS = 30_000;
const ANALYZE_REQUEST_TIMEOUT_MS = 180_000;

const FOXIT_PACKAGE_CANDIDATES = [
  "com.foxit.mobile.pdf.lite",
  "com.foxit.mobile.pdf.reader",
  "com.foxit.mobile.pdf",
];

const K = {
  title: "AI Analysis",
  subtitle: "Upload an image to see AI analysis results.",
  useCamera: "Take Photo",
  chooseGallery: "From Gallery",
  quickCheck: "Quick Check",
  quickChecking: "Quick Checking...",
  aiCheck: "AI Analysis",
  aiChecking: "Analyzing AI...",
  processing: "Processing...",
  needPermission: "Permission Required",
  needCameraPermission: "Camera permission is required.",
  needGalleryPermission: "Gallery permission is required.",
  loadImageFail: "Failed to load image.",
  requestFail: "Request failed",
  networkError: "Network Error",
  timeoutQuick: "Quick check timed out.",
  timeoutAnalyze: "AI analysis timed out.",
  noPdfUrl: "No PDF available for download.",
  invalidPdf: "Downloaded PDF is empty or corrupted.",
  nonPdfResponse: "Download response is not a valid PDF.",
  downloadFail: "PDF download failed.",
  openPdfDialog: "Open PDF Report",
  notice: "Notice",
  error: "Error",
  info: "Notice",
  savedPdf: "PDF saved to internal storage.",
  savedPath: "Save path",
  foxitMissingDefault: "Foxit app not found, opened with default PDF app.",
  foxitMissingShare: "Foxit app not found, opened via share menu.",
  quickFailTitle: "Quick Check Failed",
  quickDoneTitle: "Quick Check Complete",
  quickDoneDesc: "Run AI Analysis for detailed results.",
  aiFailTitle: "AI Analysis Failed",
  riskSummary: "Risk Summary",
  riskLabel: "Risk Level",
  noSummary: "Dental check-up recommended.",
  issuesTitle: "Findings",
  noIssue: "No significant issues found.",
  reason: "Reason",
  action: "Action",
  todoTitle: "Recommended Actions",
  clinicTitle: "Hospital Visit Needed?",
  level: "Visit Status",
  downloadPdf: "PDF Download",
  downloadingPdf: "Downloading...",
  riskHigh: "High (Red)",
  riskMedium: "Medium (Yellow)",
  riskLow: "Low (Green)",
};

const fallbackActions = [
  "Brush gently 2-3 times a day for 2 minutes starting today.",
  "Use floss once before bed and rinse with water after use.",
  "Eat sugary foods only during meals and drink water afterwards.",
  "Schedule a dental check-up within a week.",
];

function resolvePdfDownloadUrl(rawUrl: string): string {
  if (!__DEV__ || Platform.OS !== "android") return rawUrl;

  const hostRewritten = rawUrl.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");

  try {
    if (!API_BASE_URL) return hostRewritten;
    const pdf = new URL(hostRewritten);
    const api = new URL(API_BASE_URL);

    if (pdf.pathname.startsWith("/reports/")) {
      pdf.protocol = api.protocol;
      pdf.hostname = "10.0.2.2";
      pdf.port = api.port;
      return pdf.toString();
    }

    return pdf.toString();
  } catch {
    return hostRewritten;
  }
}

function toAndroidIntentUrl(contentUri: string, packageName?: string): string {
  const withoutScheme = contentUri.replace(/^content:\/\//, "");
  const packagePart = packageName ? `package=${packageName};` : "";
  return `intent://${withoutScheme}#Intent;scheme=content;${packagePart}action=android.intent.action.VIEW;type=application/pdf;launchFlags=0x10000001;end`;
}

async function tryOpenPdfInFoxit(contentUri: string): Promise<boolean> {
  for (const pkg of FOXIT_PACKAGE_CANDIDATES) {
    try {
      await Linking.openURL(toAndroidIntentUrl(contentUri, pkg));
      return true;
    } catch {
      // try next package
    }
  }
  return false;
}

async function openDownloadedPdf(uri: string): Promise<"foxit" | "default" | "shared"> {
  if (Platform.OS !== "android") {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: K.openPdfDialog,
      UTI: "com.adobe.pdf",
    });
    return "shared";
  }

  const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
  const foxitOpened = await tryOpenPdfInFoxit(contentUri);
  if (foxitOpened) return "foxit";

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: K.openPdfDialog,
    UTI: "com.adobe.pdf",
  });
  return "shared";
}

function riskUi(level?: "GREEN" | "YELLOW" | "RED"): RiskUi {
  switch (level) {
    case "RED":
      return { text: K.riskHigh, badgeClassName: "bg-red-100 text-red-700" };
    case "YELLOW":
      return { text: K.riskMedium, badgeClassName: "bg-amber-100 text-amber-700" };
    default:
      return { text: K.riskLow, badgeClassName: "bg-emerald-100 text-emerald-700" };
  }
}

function problemFromLabel(label: Detection["label"]): ProblemCard | null {
  switch (label) {
    case "caries":
      return {
        title: "Suspected Cavity",
        reason: "The model detected an area where a cavity is possible.",
        action: "Reduce sugar intake and book a dental check-up.",
      };
    case "tartar":
      return {
        title: "Suspected Tartar/Plaque",
        reason: "Deposits near the gumline were detected.",
        action: "Scaling and regular cleanings are recommended.",
      };
    case "oral_cancer":
      return {
        title: "Suspected Oral Lesion",
        reason: "An abnormal area was detected that needs clinical verification.",
        action: "See a dentist or oral surgeon as soon as possible.",
      };
    default:
      return null;
  }
}

function buildProblems(detections: Detection[], findings: AnalyzeFinding[]): ProblemCard[] {
  const fromDetection = Array.from(new Set(detections.map((d) => d.label)))
    .map(problemFromLabel)
    .filter((v): v is ProblemCard => !!v);

  if (fromDetection.length > 0) return fromDetection.slice(0, 3);

  return findings.slice(0, 3).map((f, idx) => ({
    title: f.title || `Finding ${idx + 1}`,
    reason: f.detail || "Further verification is recommended.",
    action: "Get an accurate diagnosis with professional medical care.",
  }));
}

function buildActionList(careGuide: string[]): string[] {
  const sanitized = careGuide.map((line) => line.trim()).filter((line) => line.length > 0);
  return Array.from(new Set([...sanitized, ...fallbackActions])).slice(0, 4);
}

function visitNeed(level?: "GREEN" | "YELLOW" | "RED", detections: Detection[] = []) {
  const hasOralFinding = detections.some((d) => d.label === "oral_cancer");

  if (hasOralFinding) {
    return {
      level: "Urgent",
      reason: "Suspected oral lesion found; prompt in-person consultation is necessary.",
    };
  }

  if (level === "RED" || level === "YELLOW") {
    return {
      level: "Recommended",
      reason: "Based on detected findings, a dental visit is recommended.",
    };
  }

  return {
    level: "Observe",
    reason: "No high-risk signals detected, but maintain regular check-ups.",
  };
}

export default function AICheckScreen() {
  const { token } = useAuth();
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [quickState, setQuickState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analyzeState, setAnalyzeState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [quickResult, setQuickResult] = useState<QuickResponse | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [quickError, setQuickError] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const canRunQuick = useMemo(() => !!selectedImage && quickState !== "loading", [selectedImage, quickState]);
  const canRunAnalyze = useMemo(() => !!selectedImage && analyzeState !== "loading", [selectedImage, analyzeState]);
  const canDownloadPdf = useMemo(() => !!analyzeResult?.pdfUrl && !isDownloadingPdf, [analyzeResult, isDownloadingPdf]);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(K.needPermission, useCamera ? K.needCameraPermission : K.needGalleryPermission);
      return;
    }

    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1 });

    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (!asset?.uri) {
      Alert.alert(K.error, K.loadImageFail);
      return;
    }

    const fileName = asset.fileName ?? `ai-check-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;
    const mimeType = asset.mimeType ?? (fileName.endsWith(".png") ? "image/png" : fileName.endsWith(".webp") ? "image/webp" : "image/jpeg");

    setSelectedImage({ uri: asset.uri, fileName, mimeType });
    setQuickResult(null);
    setAnalyzeResult(null);
    setQuickError("");
    setAnalyzeError("");
    setQuickState("idle");
    setAnalyzeState("idle");
  };

  const buildFormData = () => {
    const formData = new FormData();
    if (!selectedImage) return formData;
    formData.append("file", { uri: selectedImage.uri, name: selectedImage.fileName, type: selectedImage.mimeType } as never);
    return formData;
  };

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const runQuick = async () => {
    if (!selectedImage || !API_BASE_URL) return;
    setQuickState("loading");
    setQuickError("");
    setQuickResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUICK_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-check/quick`, { method: "POST", headers: buildHeaders(), body: buildFormData(), signal: controller.signal });
      const text = await res.text();
      const parsed = text ? (JSON.parse(text) as QuickResponse) : null;
      if (!res.ok || !parsed) {
        setQuickState("error");
        setQuickError(`${K.requestFail} (HTTP ${res.status})`);
        return;
      }
      setQuickResult(parsed);
      setQuickState("success");
    } catch (e) {
      const message = e instanceof Error && e.name === "AbortError" ? K.timeoutQuick : e instanceof Error ? e.message : K.networkError;
      setQuickState("error");
      setQuickError(message);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const runAnalyze = async () => {
    if (!selectedImage || !API_BASE_URL) return;
    setAnalyzeState("loading");
    setAnalyzeError("");
    setAnalyzeResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-check/analyze?generatePdf=true`, {
        method: "POST",
        headers: buildHeaders(),
        body: buildFormData(),
        signal: controller.signal,
      });
      const text = await res.text();
      const parsed = text ? (JSON.parse(text) as AnalyzeResponse) : null;
      if (!res.ok || !parsed) {
        setAnalyzeState("error");
        setAnalyzeError(`${K.requestFail} (HTTP ${res.status})`);
        return;
      }
      setAnalyzeResult(parsed);
      setAnalyzeState("success");
    } catch (e) {
      const message = e instanceof Error && e.name === "AbortError" ? K.timeoutAnalyze : e instanceof Error ? e.message : K.networkError;
      setAnalyzeState("error");
      setAnalyzeError(message);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const downloadPdf = async () => {
    if (isDownloadingPdf) return;

    const pdfUrl = analyzeResult?.pdfUrl?.trim();
    if (!pdfUrl) {
      Alert.alert(K.info, K.noPdfUrl);
      return;
    }

    setIsDownloadingPdf(true);
    const safeSessionId = (analyzeResult?.sessionId ?? `${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "");
    const targetFile = new FileSystem.File(FileSystem.Paths.document, `denticheck-report-${safeSessionId}.pdf`);
    const downloadUrl = resolvePdfDownloadUrl(pdfUrl);

    try {
      const result = await FileSystem.File.downloadFileAsync(downloadUrl, targetFile, { idempotent: true });
      const info = (await FileSystemLegacy.getInfoAsync(result.uri)) as FileSystemLegacy.FileInfo;
      const fileSize = "size" in info && typeof info.size === "number" ? info.size : 0;
      if (!info.exists || fileSize < 512) {
        throw new Error(K.invalidPdf);
      }

      const headBase64 = await FileSystemLegacy.readAsStringAsync(result.uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
        position: 0,
        length: 16,
      });
      if (!headBase64.startsWith("JVBERi0")) {
        throw new Error(K.nonPdfResponse);
      }

      const openedBy = await openDownloadedPdf(result.uri);
      if (openedBy === "default") {
        Alert.alert(K.notice, `${K.savedPdf}\n${K.savedPath}: ${result.uri}\n${K.foxitMissingDefault}`);
      } else if (openedBy === "shared") {
        Alert.alert(K.notice, `${K.savedPdf}\n${K.savedPath}: ${result.uri}\n${K.foxitMissingShare}`);
      } else {
        Alert.alert(K.notice, `${K.savedPdf}\n${K.savedPath}: ${result.uri}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : K.downloadFail;
      Alert.alert(K.error, `${message}\nURL: ${downloadUrl}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!API_BASE_URL) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-red-700">EXPO_PUBLIC_API_SERVER_URL is not configured.</Text>
      </View>
    );
  }

  const llm = analyzeResult?.llmResult;
  const risk = riskUi(llm?.riskLevel);
  const problems = buildProblems(analyzeResult?.detections ?? [], llm?.findings ?? []);
  const actions = buildActionList(llm?.careGuide ?? []);
  const visit = visitNeed(llm?.riskLevel, analyzeResult?.detections ?? []);

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text className="text-2xl font-bold text-slate-800">{K.title}</Text>
          <Text className="text-sm text-slate-500 mt-2">{K.subtitle}</Text>

          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity onPress={() => pickImage(true)} className="flex-1 bg-white rounded-2xl p-4 border border-slate-200" activeOpacity={0.85}>
              <Camera size={24} color="#0ea5e9" />
              <Text className="mt-2 font-semibold text-slate-700">{K.useCamera}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => pickImage(false)} className="flex-1 bg-white rounded-2xl p-4 border border-slate-200" activeOpacity={0.85}>
              <ImagePlus size={24} color="#0ea5e9" />
              <Text className="mt-2 font-semibold text-slate-700">{K.chooseGallery}</Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <View className="mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-black">
              <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: 280 }} resizeMode="contain" />
            </View>
          )}

          <View className="mt-6 gap-3">
            <Button className="rounded-xl" onPress={runQuick} disabled={!canRunQuick}>
              <Text className="text-white font-semibold">{quickState === "loading" ? K.quickChecking : K.quickCheck}</Text>
            </Button>
            <Button className="rounded-xl" onPress={runAnalyze} disabled={!canRunAnalyze}>
              <Text className="text-white font-semibold">{analyzeState === "loading" ? K.aiChecking : K.aiCheck}</Text>
            </Button>
          </View>

          {(quickState === "loading" || analyzeState === "loading") && (
            <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center gap-3">
              <ActivityIndicator />
              <Text className="text-slate-700">{K.processing}</Text>
            </View>
          )}

          {quickState === "error" && (
            <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
              <Text className="text-red-700 font-semibold">{K.quickFailTitle}</Text>
              <Text className="text-red-600 mt-2 text-sm">{quickError}</Text>
            </View>
          )}

          {quickState === "success" && quickResult && !analyzeResult && (
            <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4">
              <Text className="text-slate-800 font-semibold">{K.quickDoneTitle}</Text>
              <Text className="text-slate-600 mt-2 text-sm">{K.quickDoneDesc}</Text>
            </View>
          )}

          {analyzeState === "error" && (
            <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
              <Text className="text-red-700 font-semibold">{K.aiFailTitle}</Text>
              <Text className="text-red-600 mt-2 text-sm">{analyzeError}</Text>
            </View>
          )}

          {analyzeResult?.llmResult && (
            <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 gap-4">
              <View className="gap-2">
                <Text className="text-lg font-bold text-slate-800">{K.riskSummary}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-slate-700">{K.riskLabel}</Text>
                  <Text className={`px-2 py-1 rounded-full text-xs font-semibold ${risk.badgeClassName}`}>{risk.text}</Text>
                </View>
                <Text className="text-slate-700">{llm?.summary?.trim() || K.noSummary}</Text>
              </View>

              <View className="gap-2">
                <Text className="text-lg font-bold text-slate-800">{K.issuesTitle}</Text>
                {problems.length === 0 && <Text className="text-slate-700">{K.noIssue}</Text>}
                {problems.map((p, idx) => (
                  <View key={`problem-${idx}`} className="rounded-xl bg-slate-50 p-3">
                    <Text className="text-slate-800 font-semibold">{`Finding ${idx + 1}: ${p.title}`}</Text>
                    <Text className="text-slate-700 text-sm mt-1">{`${K.reason}: ${p.reason}`}</Text>
                    <Text className="text-slate-700 text-sm mt-1">{`${K.action}: ${p.action}`}</Text>
                  </View>
                ))}
              </View>

              <View className="gap-2">
                <Text className="text-lg font-bold text-slate-800">{K.todoTitle}</Text>
                {actions.map((line, idx) => (
                  <Text key={`action-${idx}`} className="text-slate-700">{`${idx + 1}. ${line}`}</Text>
                ))}
              </View>

              <View className="gap-2">
                <Text className="text-lg font-bold text-slate-800">{K.clinicTitle}</Text>
                <Text className="text-slate-800 font-semibold">{`${K.level}: ${visit.level}`}</Text>
                <Text className="text-slate-700">{`${K.reason}: ${visit.reason}`}</Text>
              </View>

              <View className="pt-2">
                <Button className="rounded-xl" onPress={downloadPdf} disabled={!canDownloadPdf}>
                  <Text className="text-white font-semibold">{isDownloadingPdf ? K.downloadingPdf : K.downloadPdf}</Text>
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
