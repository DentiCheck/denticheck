import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
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
const REQUEST_TIMEOUT_MS = 30_000;

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

        // local profile에서 pdfUrl이 19091로 내려와도 에뮬레이터에서는 API 포트(8080)로 맞춰 접근
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
    "오늘부터 하루 2~3회, 2분씩 부드럽게 양치하세요.",
    "자기 전 치실을 1회 사용하고, 사용 후 물로 헹구세요.",
    "단 음식은 식사 시간에만 먹고, 먹은 뒤 물을 마시세요.",
    "1주 안에 치과 검진 예약을 잡으세요.",
];

function riskUi(level?: "GREEN" | "YELLOW" | "RED"): RiskUi {
    switch (level) {
        case "RED":
            return { text: "높음(빨강)", badgeClassName: "bg-red-100 text-red-700" };
        case "YELLOW":
            return { text: "보통(노랑)", badgeClassName: "bg-amber-100 text-amber-700" };
        default:
            return { text: "낮음(초록)", badgeClassName: "bg-emerald-100 text-emerald-700" };
    }
}

function problemFromLabel(label: Detection["label"]): ProblemCard | null {
    switch (label) {
        case "caries":
            return {
                title: "충치 의심",
                reason: "치아 표면에 손상으로 보이는 부위가 있습니다.",
                action: "단 음식과 탄산음료를 줄이고 치과 검진을 예약하세요.",
            };
        case "tartar":
            return {
                title: "치석·잇몸 자극 의심",
                reason: "잇몸 주변에 자극을 줄 수 있는 부위가 보입니다.",
                action: "부드럽게 양치하고, 스케일링 상담을 받아보세요.",
            };
        case "oral_cancer":
            return {
                title: "입안 이상 부위 의심",
                reason: "입안 점막에 확인이 필요한 부위가 보입니다.",
                action: "가까운 시일 내 치과 진료를 받아 정확히 확인하세요.",
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
        title: f.title || `문제 ${idx + 1}`,
        reason: f.detail || "확인이 필요한 부위가 보입니다.",
        action: "무리한 자가 판단보다 치과 검진으로 확인하세요.",
    }));
}

function buildActionList(careGuide: string[]): string[] {
    const sanitized = careGuide
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/[A-Za-z]+/g, "").trim())
        .filter((line) => line.length > 0);

    return Array.from(new Set([...sanitized, ...fallbackActions])).slice(0, 4);
}

function visitNeed(level?: "GREEN" | "YELLOW" | "RED", detections: Detection[] = []) {
    const hasOralFinding = detections.some((d) => d.label === "oral_cancer");

    if (hasOralFinding) {
        return {
            level: "긴급",
            reason: "입안 이상 부위가 의심되어 빠른 진료 확인이 필요합니다.",
        };
    }

    if (level === "RED" || level === "YELLOW") {
        return {
            level: "권장",
            reason: "확인이 필요한 부위가 있어 가까운 시일 내 검진이 좋습니다.",
        };
    }

    return {
        level: "관찰",
        reason: "뚜렷한 이상 신호는 적지만 정기 검진은 유지하세요.",
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
    const [analyzeError, setAnalyzeError] = useState("");

    const canRunQuick = useMemo(() => !!selectedImage && quickState !== "loading", [selectedImage, quickState]);
    const canRunAnalyze = useMemo(() => !!selectedImage && analyzeState !== "loading", [selectedImage, analyzeState]);

    const pickImage = async (useCamera: boolean) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert("권한 필요", useCamera ? "카메라 권한이 필요합니다." : "갤러리 권한이 필요합니다.");
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
            Alert.alert("오류", "이미지를 불러오지 못했습니다.");
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
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
                setQuickError(`요청 실패 (HTTP ${res.status})`);
                return;
            }
            setQuickResult(parsed);
            setQuickState("success");
        } catch (e) {
            const message =
                e instanceof Error && e.name === "AbortError"
                    ? "빠른 검사 시간이 길어져 중단되었습니다."
                    : e instanceof Error
                      ? e.message
                      : "네트워크 오류";
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
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch(`${API_BASE_URL}/api/ai-check/analyze`, {
                method: "POST",
                headers: buildHeaders(),
                body: buildFormData(),
                signal: controller.signal,
            });
            const text = await res.text();
            const parsed = text ? (JSON.parse(text) as AnalyzeResponse) : null;
            if (!res.ok || !parsed) {
                setAnalyzeState("error");
                setAnalyzeError(`요청 실패 (HTTP ${res.status})`);
                return;
            }
            setAnalyzeResult(parsed);
            setAnalyzeState("success");
        } catch (e) {
            const message =
                e instanceof Error && e.name === "AbortError"
                    ? "AI 분석 시간이 길어져 중단되었습니다."
                    : e instanceof Error
                      ? e.message
                      : "네트워크 오류";
            setAnalyzeState("error");
            setAnalyzeError(message);
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const downloadPdf = async () => {
        const pdfUrl = analyzeResult?.pdfUrl?.trim();
        if (!pdfUrl) {
            Alert.alert("알림", "다운로드 가능한 PDF가 없습니다.");
            return;
        }
        const safeSessionId = (analyzeResult?.sessionId ?? `${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "");
        const filename = `denticheck-report-${safeSessionId}.pdf`;
        const targetFile = new FileSystem.File(FileSystem.Paths.document, filename);
        const downloadUrl = resolvePdfDownloadUrl(pdfUrl);

        try {
            const result = await FileSystem.File.downloadFileAsync(downloadUrl, targetFile, { idempotent: true });

            Alert.alert("완료", `PDF가 기기에 저장되었습니다.\n${filename}`);

            if (Platform.OS === "android") {
                return;
            }

            const canOpen = await Linking.canOpenURL(result.uri);
            if (!canOpen) {
                Alert.alert("알림", "저장은 완료됐지만 바로 열 수 있는 앱을 찾지 못했습니다.");
                return;
            }
            await Linking.openURL(result.uri);
        } catch (e) {
            const message = e instanceof Error ? e.message : "PDF 다운로드를 시작하지 못했습니다.";
            Alert.alert("오류", message);
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
                    <Text className="text-2xl font-bold text-slate-800">AI 분석</Text>
                    <Text className="text-sm text-slate-500 mt-2">이미지 업로드 후 AI 분석 결과를 확인하세요.</Text>

                    <View className="flex-row gap-3 mt-6">
                        <TouchableOpacity
                            onPress={() => pickImage(true)}
                            className="flex-1 bg-white rounded-2xl p-4 border border-slate-200"
                            activeOpacity={0.85}
                        >
                            <Camera size={24} color="#0ea5e9" />
                            <Text className="mt-2 font-semibold text-slate-700">카메라 촬영</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => pickImage(false)}
                            className="flex-1 bg-white rounded-2xl p-4 border border-slate-200"
                            activeOpacity={0.85}
                        >
                            <ImagePlus size={24} color="#0ea5e9" />
                            <Text className="mt-2 font-semibold text-slate-700">갤러리 선택</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedImage && (
                        <View className="mt-6 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: 280 }} resizeMode="contain" />
                        </View>
                    )}

                    <View className="mt-6 gap-3">
                        <Button className="rounded-xl" onPress={runQuick} disabled={!canRunQuick}>
                            <Text className="text-white font-semibold">{quickState === "loading" ? "빠른 검사 중..." : "빠른 검사"}</Text>
                        </Button>
                        <Button className="rounded-xl" onPress={runAnalyze} disabled={!canRunAnalyze}>
                            <Text className="text-white font-semibold">{analyzeState === "loading" ? "AI 분석 중..." : "AI 분석"}</Text>
                        </Button>
                    </View>

                    {(quickState === "loading" || analyzeState === "loading") && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center gap-3">
                            <ActivityIndicator />
                            <Text className="text-slate-700">처리 중...</Text>
                        </View>
                    )}

                    {quickState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">빠른 검사 실패</Text>
                            <Text className="text-red-600 mt-2 text-sm">{quickError}</Text>
                        </View>
                    )}

                    {quickState === "success" && quickResult && !analyzeResult && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4">
                            <Text className="text-slate-800 font-semibold">빠른 검사 완료</Text>
                            <Text className="text-slate-600 mt-2 text-sm">자세한 결과가 필요하면 AI 분석을 실행하세요.</Text>
                        </View>
                    )}

                    {analyzeState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">AI 분석 실패</Text>
                            <Text className="text-red-600 mt-2 text-sm">{analyzeError}</Text>
                        </View>
                    )}

                    {analyzeResult?.llmResult && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 gap-4">
                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">위험도 요약</Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-slate-700">위험도:</Text>
                                    <Text className={`px-2 py-1 rounded-full text-xs font-semibold ${risk.badgeClassName}`}>{risk.text}</Text>
                                </View>
                                <Text className="text-slate-700">{llm?.summary?.trim() || "확인이 필요한 부위가 보여 치과 점검을 권장합니다."}</Text>
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">발견된 문제</Text>
                                {problems.length === 0 && <Text className="text-slate-700">뚜렷한 이상 문제는 크지 않아 보입니다.</Text>}
                                {problems.map((p, idx) => (
                                    <View key={`problem-${idx}`} className="rounded-xl bg-slate-50 p-3">
                                        <Text className="text-slate-800 font-semibold">{`문제 ${idx + 1}: ${p.title}`}</Text>
                                        <Text className="text-slate-700 text-sm mt-1">{`왜 문제인지: ${p.reason}`}</Text>
                                        <Text className="text-slate-700 text-sm mt-1">{`지금 해야 할 행동: ${p.action}`}</Text>
                                    </View>
                                ))}
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">지금 해야 할 것</Text>
                                {actions.map((line, idx) => (
                                    <Text key={`action-${idx}`} className="text-slate-700">{`${idx + 1}. ${line}`}</Text>
                                ))}
                            </View>

                            <View className="gap-2">
                                <Text className="text-lg font-bold text-slate-800">병원 방문 필요 여부</Text>
                                <Text className="text-slate-800 font-semibold">{`방문 수준: ${visit.level}`}</Text>
                                <Text className="text-slate-700">{`이유: ${visit.reason}`}</Text>
                            </View>

                            <View className="pt-2">
                                <Button className="rounded-xl" onPress={downloadPdf}>
                                    <Text className="text-white font-semibold">PDF 다운로드</Text>
                                </Button>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
