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
  title: "\u0041\u0049 \ubd84\uc11d",
  subtitle: "\uc774\ubbf8\uc9c0\ub97c \uc5c5\ub85c\ub4dc\ud558\uace0 \ubd84\uc11d \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc138\uc694.",
  useCamera: "\uce74\uba54\ub77c \ucd2c\uc601",
  chooseGallery: "\uac24\ub7ec\ub9ac \uc120\ud0dd",
  quickCheck: "\ube60\ub978 \uac80\uc0ac",
  quickChecking: "\ube60\ub978 \uac80\uc0ac \uc911...",
  aiCheck: "\u0041\u0049 \ubd84\uc11d",
  aiChecking: "\u0041\u0049 \ubd84\uc11d \uc911...",
  processing: "\ucc98\ub9ac \uc911...",
  needPermission: "\uad8c\ud55c \ud544\uc694",
  needCameraPermission: "\uce74\uba54\ub77c \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
  needGalleryPermission: "\uac24\ub7ec\ub9ac \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
  loadImageFail: "\uc774\ubbf8\uc9c0\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
  requestFail: "\uc694\uccad \uc2e4\ud328",
  networkError: "\ub124\ud2b8\uc6cc\ud06c \uc624\ub958",
  timeoutQuick: "\ube60\ub978 \uac80\uc0ac \uc2dc\uac04\uc774 \ucd08\uacfc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  timeoutAnalyze: "\u0041\u0049 \ubd84\uc11d \uc2dc\uac04\uc774 \ucd08\uacfc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  noPdfUrl: "\u0050\u0044\u0046 \u0055\u0052\u004c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  invalidPdf: "\ub2e4\uc6b4\ub85c\ub4dc\ub41c \u0050\u0044\u0046\uac00 \ube44\uc5b4\uc788\uac70\ub098 \uc190\uc0c1\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  nonPdfResponse: "\ub2e4\uc6b4\ub85c\ub4dc \uc751\ub2f5\uc774 \u0050\u0044\u0046 \ud615\uc2dd\uc774 \uc544\ub2d9\ub2c8\ub2e4.",
  downloadFail: "\u0050\u0044\u0046 \ub2e4\uc6b4\ub85c\ub4dc\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.",
  openPdfDialog: "\u0050\u0044\u0046 \ub9ac\ud3ec\ud2b8 \uc5f4\uae30",
  notice: "\uc548\ub0b4",
  error: "\uc624\ub958",
  info: "\uc54c\ub9bc",
  savedPdf: "\u0050\u0044\u0046\uac00 \uae30\uae30\uc5d0 \uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  savedPath: "\uc800\uc7a5 \uacbd\ub85c",
  foxitMissingDefault: "\u0046\u006f\u0078\u0069\u0074 \uc571\uc744 \ucc3e\uc9c0 \ubabb\ud574 \uae30\ubcf8 \u0050\u0044\u0046 \uc571\uc73c\ub85c \uc5f4\uc5c8\uc2b5\ub2c8\ub2e4.",
  foxitMissingShare: "\u0046\u006f\u0078\u0069\u0074 \uc571\uc744 \ucc3e\uc9c0 \ubabb\ud574 \uacf5\uc720 \uba54\ub274\ub85c \uc5f4\uc5c8\uc2b5\ub2c8\ub2e4.",
  quickFailTitle: "\ube60\ub978 \uac80\uc0ac \uc2e4\ud328",
  quickDoneTitle: "\ube60\ub978 \uac80\uc0ac \uc644\ub8cc",
  quickDoneDesc: "\uc790\uc138\ud55c \uacb0\uacfc\ub294 \u0041\u0049 \ubd84\uc11d\uc744 \uc2e4\ud589\ud574 \uc8fc\uc138\uc694.",
  aiFailTitle: "\u0041\u0049 \ubd84\uc11d \uc2e4\ud328",
  riskSummary: "\uc704\ud5d8\ub3c4 \uc694\uc57d",
  riskLabel: "\uc704\ud5d8\ub3c4",
  noSummary: "\uce58\uacfc \ucd94\uc801 \uac80\uc9c4\uc744 \uad8c\uc7a5\ud569\ub2c8\ub2e4.",
  issuesTitle: "\ud0d0\uc9c0\ub41c \ubb38\uc81c",
  noIssue: "\uc911\uc694 \uc774\uc0c1 \uc18c\uacac\uc774 \uac10\uc9c0\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
  reason: "\uc0ac\uc720",
  action: "\uad8c\uc7a5 \ud589\ub3d9",
  todoTitle: "\uc9c0\uae08 \ud574\uc57c \ud560 \uac83",
  clinicTitle: "\ubcd1\uc6d0 \ubc29\ubb38 \ud544\uc694 \uc5ec\ubd80",
  level: "\uc218\uc900",
  downloadPdf: "\u0050\u0044\u0046 \ub2e4\uc6b4\ub85c\ub4dc",
  downloadingPdf: "\u0050\u0044\u0046 \ub2e4\uc6b4\ub85c\ub4dc \uc911...",
  riskHigh: "\ub192\uc74c",
  riskMedium: "\ubcf4\ud1b5",
  riskLow: "\ub0ae\uc74c",
};

const fallbackActions = [
  "\ud558\ub8e8 2~3\ud68c, 2\ubd84 \uc774\uc0c1 \ubd80\ub4dc\ub7fd\uac8c \uc591\uce58\ud558\uc138\uc694.",
  "\uce58\uc2e4 \ub610\ub294 \uce58\uac04\uce6b\uc194\uc744 \ud558\ub8e8 1\ud68c \uc0ac\uc6a9\ud558\uc138\uc694.",
  "\ub2f9\ubd84 \uc12d\ucde8\ub97c \uc904\uc774\uace0 \uc2dd\ud6c4\uc5d0\ub294 \ubb3c\ub85c \ud5f9\uad6c\uc138\uc694.",
  "1~2\uc8fc \ub0b4 \uce58\uacfc \uac80\uc9c4 \uc77c\uc815\uc744 \uc7a1\uc73c\uc138\uc694.",
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
        title: "\ucda9\uce58 \uc758\uc2ec",
        reason: "\ubaa8\ub378\uc774 \ucda9\uce58 \uac00\ub2a5\uc131\uc774 \uc788\ub294 \uc601\uc5ed\uc744 \uac10\uc9c0\ud588\uc2b5\ub2c8\ub2e4.",
        action: "\ub2f9\ubd84 \uc12d\ucde8\ub97c \uc904\uc774\uace0 \uce58\uacfc \uac80\uc9c4\uc744 \uc608\uc57d\ud558\uc138\uc694.",
      };
    case "tartar":
      return {
        title: "\uce58\uc11d/\ud50c\ub77c\uadf8 \uc758\uc2ec",
        reason: "\uc787\ubab8 \uacbd\uacc4 \ubd80\uadfc \uce68\ucc29\ubb3c\uc774 \uac10\uc9c0\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
        action: "\uc2a4\ucf00\uc77c\ub9c1 \ubc0f \uc815\uae30 \ud074\ub9ac\ub2dd \uc0c1\ub2f4\uc744 \uad8c\uc7a5\ud569\ub2c8\ub2e4.",
      };
    case "oral_cancer":
      return {
        title: "\uad6c\uac15 \ubcd1\ubcc0 \uc758\uc2ec",
        reason: "\ube44\uc815\uc0c1 \uc601\uc5ed\uc774 \uac10\uc9c0\ub418\uc5b4 \uc784\uc0c1 \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
        action: "\uac00\uae09\uc801 \ube60\ub974\uac8c \uce58\uacfc/\uad6c\uac15\uc678\uacfc \uc9c4\ub8cc\ub97c \ubc1b\uc73c\uc138\uc694.",
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
    title: f.title || `\ubb38\uc81c ${idx + 1}`,
    reason: f.detail || "\ucd94\uac00 \ud655\uc778\uc774 \uad8c\uc7a5\ub429\ub2c8\ub2e4.",
    action: "\uc804\ubb38\uac00 \uc9c4\ub8cc\ub85c \uc815\ud655\ud55c \uc9c4\ub2e8\uc744 \ubc1b\uc73c\uc138\uc694.",
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
      level: "\uae34\uae09",
      reason: "\uad6c\uac15 \ubcd1\ubcc0 \uc758\uc2ec \uc18c\uacac\uc774 \uc788\uc5b4 \ube60\ub978 \ub300\uba74 \uc9c4\ub8cc\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    };
  }

  if (level === "RED" || level === "YELLOW") {
    return {
      level: "\uad8c\uc7a5",
      reason: "\uac10\uc9c0\ub41c \uc18c\uacac\uc73c\ub85c \ubcf4\uc544 \uce58\uacfc \ubc29\ubb38\uc744 \uad8c\uc7a5\ud569\ub2c8\ub2e4.",
    };
  }

  return {
    level: "\uad00\ucc30",
    reason: "\uace0\uc704\ud5d8 \uc2e0\ud638\ub294 \ud06c\uc9c0 \uc54a\uc9c0\ub9cc \uc815\uae30 \uac80\uc9c4\uc744 \uc720\uc9c0\ud558\uc138\uc694.",
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
                    <Text className="text-slate-800 font-semibold">{`\ubb38\uc81c ${idx + 1}: ${p.title}`}</Text>
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
