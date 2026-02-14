import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_SERVER_URL;
const REQUEST_TIMEOUT_MS = 30_000;

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

    if (!API_BASE_URL) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50">
                <Text className="text-red-700">EXPO_PUBLIC_API_SERVER_URL is not configured.</Text>
            </View>
        );
    }

    const detections = quickResult?.detections ?? analyzeResult?.detections ?? [];

    return (
        <View className="flex-1 bg-slate-50">
            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                    <Text className="text-2xl font-bold text-slate-800">Run AI</Text>
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
                            <Image
                                source={{ uri: selectedImage.uri }}
                                style={{ width: "100%", height: 280 }}
                                resizeMode="contain"
                            />
                        </View>
                    )}

                    <View className="mt-6 gap-3">
                        <Button className="rounded-xl" onPress={runQuick} disabled={!canRunQuick}>
                            <Text className="text-white font-semibold">
                                {quickState === "loading" ? "빠른 검사 중.." : "빠른 검사"}
                            </Text>
                        </Button>
                        <Button className="rounded-xl" onPress={runAnalyze} disabled={!canRunAnalyze}>
                            <Text className="text-white font-semibold">
                                {analyzeState === "loading" ? "AI 분석 중.." : "AI 분석(LLM)"}
                            </Text>
                        </Button>
                    </View>

                    {(quickState === "loading" || analyzeState === "loading") && (
                        <View className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center gap-3">
                            <ActivityIndicator />
                            <Text className="text-slate-700">처리 중..</Text>
                        </View>
                    )}

                    {quickState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">빠른 검사 실패</Text>
                            <Text className="text-red-600 mt-2 text-sm">{quickError}</Text>
                        </View>
                    )}

                    {analyzeState === "error" && (
                        <View className="mt-6 bg-white border border-red-200 rounded-2xl p-4">
                            <Text className="text-red-700 font-semibold">AI 분석 실패</Text>
                            <Text className="text-red-600 mt-2 text-sm">{analyzeError}</Text>
                        </View>
                    )}

                    {(quickResult || analyzeResult) && (
                        <View className="mt-6 gap-4">
                            <View className="bg-white border border-slate-200 rounded-2xl p-4">
                                <Text className="font-bold text-slate-800">분석 목록</Text>
                                {(detections?.length ?? 0) === 0 && (
                                    <Text className="text-slate-600 mt-2">분석 없음</Text>
                                )}
                                {(detections ?? []).slice(0, 10).map((d, idx) => (
                                    <Text key={`det-${idx}`} className="text-slate-700 mt-2">
                                        {idx + 1}. {d.label} ({d.confidence.toFixed(2)})
                                    </Text>
                                ))}
                            </View>

                            {analyzeResult?.llmResult && (
                                <View className="bg-white border border-slate-200 rounded-2xl p-4 gap-2">
                                    <Text className="text-lg font-bold text-slate-800">LLM 분석</Text>
                                    <Text className="text-slate-700">위험도: {analyzeResult.llmResult.riskLevel}</Text>
                                    <Text className="text-slate-700">{analyzeResult.llmResult.summary}</Text>

                                    <Text className="font-semibold text-slate-800 mt-2">소견</Text>
                                    {(analyzeResult.llmResult.findings ?? []).map((f, idx) => (
                                        <View key={`finding-${idx}`} className="mt-1">
                                            <Text className="text-slate-800">
                                                {idx + 1}. {f.title}
                                            </Text>
                                            <Text className="text-slate-600 text-sm">{f.detail}</Text>
                                        </View>
                                    ))}

                                    <Text className="font-semibold text-slate-800 mt-2">관리 가이드</Text>
                                    {(analyzeResult.llmResult.careGuide ?? []).map((line, idx) => (
                                        <Text key={`guide-${idx}`} className="text-slate-600 text-sm">
                                            {idx + 1}. {line}
                                        </Text>
                                    ))}

                                    <Text className="font-semibold text-slate-800 mt-2">근거 보기 (Top 3)</Text>
                                    {(analyzeResult.rag?.sources ?? []).slice(0, 3).map((s, idx) => (
                                        <View key={`rag-${idx}`} className="mt-1">
                                            <Text className="text-slate-800 text-sm">
                                                {idx + 1}. {s.source}
                                            </Text>
                                            <Text className="text-slate-500 text-xs">{s.snippet}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
