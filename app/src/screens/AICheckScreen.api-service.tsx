import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Upload,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { Card } from "../shared/components/ui/Card";
import { Button } from "../shared/components/ui/Button";
import { Badge } from "../shared/components/ui/Badge";
import { Progress } from "../shared/components/ui/Progress";
import { useColorTheme } from "../shared/providers/ColorThemeProvider";

type AnalysisResult = {
  quality: "good" | "poor";
  detections: Array<{ type: string; severity: string; position: string }>;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  recommendations: string[];
};

export default function AICheckScreen() {
  const navigation = useNavigation();
  const { theme } = useColorTheme();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert("Permission to access camera is required!");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert("Permission to access gallery is required!");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    }

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeImage();
    }
  };

  const analyzeImage = () => {
    setAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      setResult({
        quality: "good",
        detections: [
          { type: "移섏꽍", severity: "寃쎈?", position: "?섏븙 ?꾩튂遺" },
          { type: "?뉖じ ?쇱쬆", severity: "以묐벑??, position: "?곸븙 醫뚯륫" },
        ],
        riskLevel: "medium",
        summary:
          "?꾨컲?곸씤 援ш컯 ?곹깭???묓샇?섎굹, 移섏꽍怨??뉖じ ?쇱쬆??愿李곕맗?덈떎.",
        recommendations: [
          "?뺢린?곸씤 ?ㅼ??쇰쭅 (3-6媛쒖썡 留덈떎)",
          "?뉖じ 留덉궗吏 諛?移섏떎 ?ъ슜",
          "?쇱쬆 遺??二쇱쓽 源딄쾶 愿由?,
          "?꾩슂??移섍낵 ?곷떞 沅뚯옣",
        ],
      });
      setAnalyzing(false);
    }, 3000);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100";
      case "medium":
        return "bg-yellow-100";
      case "high":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case "low":
        return "#166534";
      case "medium":
        return "#854d0e";
      case "high":
        return "#991b1b";
      default:
        return "#1f2937";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low":
        return "??쓬";
      case "medium":
        return "蹂댄넻";
      case "high":
        return "?믪쓬";
      default:
        return "?????놁쓬";
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Minimal Header */}
        <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-slate-800">
          <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">
            Run AI
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          <View className="mb-6">
            <Text className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              援ш컯 ?곹깭 遺꾩꽍
            </Text>
            <Text className="text-slate-500 text-sm">
              AI媛 移섏븘 ?ъ쭊??遺꾩꽍?섏뿬{"\n"}嫄닿컯 ?곹깭? 愿由щ쾿???뚮젮?쒕┰?덈떎.
            </Text>
          </View>

          {!image && (
            <TouchableOpacity
              activeOpacity={0.9}
              className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 items-center justify-center space-y-4"
              onPress={() => pickImage(true)}
            >
              <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center">
                <Camera size={32} color={theme.primary} />
              </View>
              <View className="items-center">
                <Text className="font-bold text-slate-800 dark:text-white text-lg">
                  ?ъ쭊 珥ъ쁺?섍린
                </Text>
                <Text className="text-slate-400 text-sm text-center mt-1">
                  諛앹? 怨녹뿉???낆쓣 ?ш쾶 踰뚮━怨?"\n"}移섏븘媛 ??蹂댁씠?꾨줉
                  珥ъ쁺?섏꽭??                </Text>
              </View>
              <Button
                variant="outline"
                onPress={() => pickImage(false)}
                className="mt-4 border-slate-200"
              >
                <Text className="text-slate-600">媛ㅻ윭由ъ뿉???좏깮</Text>
              </Button>
            </TouchableOpacity>
          )}

          {image && !result && !analyzing && (
            <View className="space-y-6">
              <View className="rounded-3xl overflow-hidden shadow-sm bg-black">
                <Image
                  source={{ uri: image }}
                  style={{ width: "100%", height: 300 }}
                  resizeMode="contain"
                />
              </View>
              <Button
                onPress={analyzeImage}
                size="lg"
                className="rounded-full"
                style={{
                  elevation: 10,
                  shadowColor: "#3b82f6",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                }}
              >
                <Text className="text-white font-bold text-lg">
                  遺꾩꽍 ?쒖옉?섍린
                </Text>
              </Button>
              <Button variant="ghost" onPress={() => setImage(null)}>
                <Text className="text-slate-500">?ㅼ떆 ?좏깮?섍린</Text>
              </Button>
            </View>
          )}

          {analyzing && (
            <View className="py-20 items-center justify-center space-y-8">
              <View className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center animate-pulse">
                <TrendingUp size={40} color={theme.primary} />
              </View>
              <View className="items-center space-y-2">
                <Text className="text-xl font-bold text-slate-800">
                  遺꾩꽍 以묒엯?덈떎...
                </Text>
                <Text className="text-slate-500">?좎떆留?湲곕떎?ㅼ＜?몄슂</Text>
              </View>
              <View className="w-full max-w-[200px]">
                <Progress value={66} className="h-2" />
              </View>
            </View>
          )}

          {result && (
            <View className="space-y-6">
              {/* Summary Card */}
              <LinearGradient
                colors={["#ffffff", "#f8fafc"]}
                className="p-6 rounded-3xl border border-slate-100 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                    <Sparkles
                      size={20}
                      color={theme.primary}
                      fill={theme.primary}
                    />
                    <Text className="font-bold text-lg text-slate-800">
                      遺꾩꽍 寃곌낵
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${getRiskColor(result.riskLevel)}`}
                  >
                    <Text
                      style={{
                        color: getRiskTextColor(result.riskLevel),
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      ?꾪뿕??{getRiskLabel(result.riskLevel)}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-700 leading-relaxed font-medium text-base">
                  {result.summary}
                </Text>
              </LinearGradient>

              {/* Detections */}
              {result.detections.length > 0 && (
                <View>
                  <Text className="font-bold text-lg text-slate-800 mb-3 ml-1">
                    諛쒓껄??利앹긽
                  </Text>
                  <View className="space-y-3">
                    {result.detections.map((detection, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                      >
                        <View className="flex-row items-center gap-3">
                          <View className="w-2 h-10 rounded-full bg-red-400" />
                          <View>
                            <Text className="font-bold text-slate-800">
                              {detection.type}
                            </Text>
                            <Text className="text-xs text-slate-500 mt-0.5">
                              {detection.position}
                            </Text>
                          </View>
                        </View>
                        <View className="bg-slate-100 px-2 py-1 rounded-md">
                          <Text className="text-slate-600 text-xs font-medium">
                            {detection.severity}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recommendations */}
              <View>
                <Text className="font-bold text-lg text-slate-800 mb-3 ml-1">
                  留욎땄 耳??媛?대뱶
                </Text>
                <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  {result.recommendations.map((rec, idx) => (
                    <View key={idx} className="flex-row items-start gap-3">
                      <CheckCircle2
                        size={20}
                        color={theme.secondary}
                        style={{ marginTop: 2 }}
                      />
                      <Text className="text-slate-600 text-sm flex-1 leading-5">
                        {rec}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Button
                onPress={() => {
                  setImage(null);
                  setResult(null);
                }}
                size="lg"
                className="rounded-full mt-4"
              >
                <Text className="font-bold text-white">泥섏쓬?쇰줈</Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
