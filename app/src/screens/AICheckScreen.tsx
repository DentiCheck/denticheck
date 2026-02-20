import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
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
const ANALYZE_REQUEST_TIMEOUT_MS = 180_000; // Keep current branch's extended timeout

function resolvePdfDownloadUrl(rawUrl: string): string {
    if (!__DEV__ || Platform.OS !== "android") return rawUrl;

    const hostRewritten = rawUrl
        .replace("://localhost", "://10.0.2.2")
        .replace("://127.0.0.1", "://10.0.2.2");

    try {
        if (!API_BASE_URL) return hostRewritten;
        const pdf = new URL(hostRewritten);
        const api = new URL(API_BASE_URL);
        const isLocalLike = pdf.hostname === "10.0.2.2" || pdf.hostname === "localhost" || pdf.hostname === "127.0.0.1";

        // Even if pdfUrl comes down as 19091 in local profile, access via API port (8080) in emulator
        if (isLocalLike && pdf.pathname.startsWith("/reports/")) {
            pdf.protocol = api.protocol;
            pdf.hostname = api.hostname;
            pdf.port = api.port;
            return pdf.toString();
        }

        return pdf.toString();
    } catch {
        return hostRewritten;
    }
}

const fallbackActions = [
    "Brush gently 2-3 times a day for 2 minutes starting today.",
    "Use floss once before bed and rinse with water after use.",
    "Eat sugary foods only during meals and drink water afterwards.",
    "Schedule a dental check-up within a week.",
];

function riskUi(level?: "GREEN" | "YELLOW" | "RED"): RiskUi {
    switch (level) {
        case "RED":
            return { text: "High (Red)", badgeClassName: "bg-red-100 text-red-700" };
        case "YELLOW":
            return { text: "Medium (Yellow)", badgeClassName: "bg-amber-100 text-amber-700" };
        default:
            return { text: "Low (Green)", badgeClassName: "bg-emerald-100 text-emerald-700" };
    }
}

function problemFromLabel(label: Detection["label"]): ProblemCard | null {
    switch (label) {
        case "caries":
            return {
                title: "Suspected Cavity",
                reason: "There is an area that looks like damage on the tooth surface.",
                action: "Reduce sugary foods and sodas, and schedule a dental check-up.",
            };
        case "tartar":
            return {
                title: "Suspected Tartar/Gum Irritation",
                reason: "An area that could irritate the gums is visible.",
                action: "Brush gently and consult about scaling.",
            };
        case "oral_cancer":
            return {
                title: "Suspected Abnormal Area",
                reason: "An area needing verification is visible on the oral mucosa.",
                action: "Visit a dentist soon for accurate confirmation.",
            };
        default:
            return null;
    }
}

function buildProblems(detections: Detection[], findings: AnalyzeFinding[]): ProblemCard[] {
    const fromDetection = Array.from(new Set(detections.map((d) => d.label)))
        .map(problemFromLabel)
        .filter((v): v is ProblemCard => !!v);

    if (fromDetection.length > 0) {
        return fromDetection.slice(0, 3);
    }

    return findings.slice(0, 3).map((f, idx) => ({
        title: f.title || `Finding ${idx + 1}`,
        reason: f.detail || "An area needing verification is visible.",
        action: "Confirm with a dental check-up rather than self-judgment.",
    }));
}

function buildActionList(careGuide: string[]): string[] {
    const sanitized = careGuide
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    // Removed regex that deleted English characters to support English version

    return Array.from(new Set([...sanitized, ...fallbackActions])).slice(0, 4);
}

function visitNeed(level?: "GREEN" | "YELLOW" | "RED", detections: Detection[] = []) {
    const hasOralFinding = detections.some((d) => d.label === "oral_cancer");

    if (hasOralFinding) {
        return {
            level: "Urgent",
            reason: "An abnormal area is suspected, requiring quick medical confirmation.",
        };
    }

    if (level === "RED" || level === "YELLOW") {
        return {
            level: "Recommended",
            reason: "A check-up is recommended soon as there is an area needing verification.",
        };
    }

    return {
        level: "Observe",
        reason: "Few distinct abnormal signals, but maintain regular check-ups.",
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
            Alert.alert("Permission Required", useCamera ? "Camera permission is required." : "Gallery permission is required.");
            return;
        }

        const picked = useCamera
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });

        if (picked.canceled) return;

        const asset = picked.assets[0];
        if (!asset?.uri) {
            Alert.alert("Error", "Failed to load image.");
            return;
        }

        const fileName = asset.fileName ?? `ai-check-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;
        const mimeType =
            asset.mimeType ??
            (fileName.endsWith(".png") ? "image/png" : fileName.endsWith(".webp") ? "image/webp" : "image/jpeg");

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
        formData.append("file", {
            uri: selectedImage.uri,
            name: selectedImage.fileName,
            type: selectedImage.mimeType,
        } as never);
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
            const res = await fetch(`${API_BASE_URL}/api/ai-check/quick`, {
                method: "POST",
                headers: buildHeaders(),
                body: buildFormData(),
                signal: controller.signal,
            });
            const text = await res.text();
            const parsed = text ? (JSON.parse(text) as QuickResponse) : null;
            if (!res.ok || !parsed) {
                setQuickState("error");
                setQuickError(`Request failed (HTTP ${res.status})`);
                return;
            }
            setQuickResult(parsed);
            setQuickState("success");
        } catch (e) {
            const message =
                e instanceof Error && e.name === "AbortError"
                    ? "Quick check timed out."
                    : e instanceof Error
                        ? e.message
                        : "Network Error";
            setQuickState("error");
            setQuickError(message || "Network Error");
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
                setAnalyzeError(`Request failed (HTTP ${res.status})`);
                return;
            }
            setAnalyzeResult(parsed);
            setAnalyzeState("success");
        } catch (e) {
            const message =
                e instanceof Error && e.name === "AbortError"
                    ? "AI analysis timed out."
                    : e instanceof Error
                        ? e.message
                        : "Network Error";
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
            Alert.alert("Notice", "No PDF available for download.");
            return;
        }

        setIsDownloadingPdf(true);
        const safeSessionId = (analyzeResult?.sessionId ?? `${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "");
        const filename = `denticheck-report-${safeSessionId}.pdf`;
        const targetFile = new FileSystem.File(FileSystem.Paths.document, filename);
        const downloadUrl = resolvePdfDownloadUrl(pdfUrl);

        try {
            const result = await FileSystem.File.downloadFileAsync(downloadUrl, targetFile, { idempotent: true });

            // Use Sharing library to allow opening the file or saving (sharing) it elsewhere.
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
                await Sharing.shareAsync(result.uri, {
                    mimeType: "application/pdf",
                    dialogTitle: "Save and Open PDF Report",
                    UTI: "com.adobe.pdf",
                });
            } else {
                Alert.alert("Complete", `PDF saved to internal storage.\n${filename}`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to start PDF download.";
            Alert.alert("Error", message || "Failed to start PDF download.");
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
                    <Text className="text-2xl font-bold text-slate-800">AI Analysis</Text>
                    <Text className="text-sm text-slate-500 mt-2">Upload an image to see AI analysis results.</Text>

                    <View className="flex-row gap-3 mt-6">
                        <TouchableOpacity
                            onPress={() => pickImage(true)}
                            className="flex-1 bg-white rounded-2xl p-4 border border-slate-200"
                            activeOpacity={0.85}
                        >
                            <Camera size={24} color="#0ea5e9" />
                            <Text className="mt-2 font-semibold text-slate-700">Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => pickImage(false)}
                            className="flex-1 bg-white rounded-2xl p-4 border border-slate-200"
                            activeOpacity={0.85}
                        >
                            <ImagePlus size={24} color="#0ea5e9" />
                            <Text className="mt-2 font-semibold text-slate-700">From Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedImage && (
                        <View className="mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: 280 }} resizeMode="contain" />
                        </View>
                    )}

                    <View className="mt-6 gap-3">
                        <Button className="rounded-xl" onPress={runQuick} disabled={!canRunQuick}>
                            <Text className="text-white font-semibold">{quickState === "loading" ? "Quick Checking..." : "Quick Check"}</Text>
                        </Button>
                        <Button className="rounded-xl" onPress={runAnalyze} disabled={!canRunAnalyze}>
                            <Text className="text-white font-semibold">{analyzeState === "loading" ? "Analyzing AI..." : "AI Analysis"}</Text>
                        </Button>
                    </View>

                    {(quickState === "loading" || analyzeState === "loading") && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center gap-3">
                            <ActivityIndicator />
                            <Text className="text-slate-700">Processing...</Text>
                        </View>
                    )}

                    {quickState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">Quick Check Failed</Text>
                            <Text className="text-red-600 mt-2 text-sm">{quickError}</Text>
                        </View>
                    )}

                    {quickState === "success" && quickResult && !analyzeResult && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4">
                            <Text className="text-slate-800 font-semibold">Quick Check Complete</Text>
                            <Text className="text-slate-600 mt-2 text-sm">Run AI Analysis for detailed results.</Text>
                        </View>
                    )}

                    {analyzeState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">AI Analysis Failed</Text>
                            <Text className="text-red-600 mt-2 text-sm">{analyzeError}</Text>
                        </View>
                    )}

                    {analyzeResult?.llmResult && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 gap-4">
                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">Risk Summary</Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-slate-700">Risk Level:</Text>
                                    <Text className={`px-2 py-1 rounded-full text-xs font-semibold ${risk.badgeClassName}`}>{risk.text}</Text>
                                </View>
                                <Text className="text-slate-700">{llm?.summary?.trim() || "An area needing verification is visible, dental check-up recommended."}</Text>
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">Findings</Text>
                                {problems.length === 0 && <Text className="text-slate-700">No significant issues found.</Text>}
                                {problems.map((p, idx) => (
                                    <View key={`problem-${idx}`} className="rounded-xl bg-slate-50 p-3">
                                        <Text className="text-slate-800 font-semibold">{`Finding ${idx + 1}: ${p.title}`}</Text>
                                        <Text className="text-slate-700 text-sm mt-1">{`Reason: ${p.reason}`}</Text>
                                        <Text className="text-slate-700 text-sm mt-1">{`Action: ${p.action}`}</Text>
                                    </View>
                                ))}
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">Recommended Actions</Text>
                                {actions.map((line, idx) => (
                                    <Text key={`action-${idx}`} className="text-slate-700">{`${idx + 1}. ${line}`}</Text>
                                ))}
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">Hospital Visit Needed?</Text>
                                <Text className="text-slate-800 font-semibold">{`Visit Status: ${visit.level}`}</Text>
                                <Text className="text-slate-700">{`Reason: ${visit.reason}`}</Text>
                            </View>

                            <View className="pt-2">
                                <Button className="rounded-xl" onPress={downloadPdf} disabled={!canDownloadPdf}>
                                    <Text className="text-white font-semibold">
                                        {isDownloadingPdf ? "Downloading..." : "PDF Download"}
                                    </Text>
                                </Button>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
