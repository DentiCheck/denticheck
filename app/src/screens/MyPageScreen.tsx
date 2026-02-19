import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  ChevronRight,
  Heart,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Calendar,
  Camera,
  AlertCircle,
  Palette,
  FileText,
  Settings,
  MessageSquare,
  ThumbsUp,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../shared/providers/AuthProvider";

type HealthRecord = {
  id: string;
  date: Date;
  type: "survey" | "ai-check" | "note";
  score?: number;
  riskLevel?: string;
  summary: string;
  note?: string;
};

export default function MyPageScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();

  const healthRecords: HealthRecord[] = [
    {
      id: "1",
      date: new Date("2026-02-03"),
      type: "ai-check",
      riskLevel: "medium",
      summary: "치석과 잇몸 염증 관찰",
    },
    {
      id: "2",
      date: new Date("2026-02-01"),
      type: "survey",
      score: 75,
      summary: "전반적으로 양호, 치실 사용 권장",
    },
    {
      id: "3",
      date: new Date("2026-01-28"),
      type: "note",
      summary: "잇몸 출혈 있음",
      note: "양치 후 약간의 출혈이 있어 기록함",
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      "회원탈퇴",
      "정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: () => navigation.replace("Login"),
        },
      ],
    );
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "survey":
        return FileText;
      case "ai-check":
        return Camera;
      case "note":
        return Calendar;
      default:
        return FileText;
    }
  };

  const RecordCard = ({ record }: { record: HealthRecord }) => {
    const Icon = getRecordIcon(record.type);
    const iconColor =
      record.type === "ai-check"
        ? "#3b82f6"
        : record.type === "survey"
          ? "#8b5cf6"
          : "#f59e0b";
    const iconBg =
      record.type === "ai-check"
        ? "bg-blue-50"
        : record.type === "survey"
          ? "bg-violet-50"
          : "bg-amber-50";

    return (
      <View className="p-4 mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex-row gap-4">
        <View
          className={`w-12 h-12 rounded-2xl items-center justify-center ${iconBg}`}
        >
          <Icon size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs font-bold text-slate-400">
              {record.type === "ai-check"
                ? "AI 분석"
                : record.type === "survey"
                  ? "건강 설문"
                  : "메모"}{" "}
              • {record.date.toLocaleDateString()}
            </Text>
          </View>
          <Text className="font-bold text-slate-800 text-sm mb-1.5">
            {record.summary}
          </Text>

          {record.score && (
            <View className="self-start bg-violet-50 px-2 py-0.5 rounded-md">
              <Text className="text-xs font-bold text-violet-700">
                점수 {record.score}점
              </Text>
            </View>
          )}
          {record.riskLevel && (
            <View
              className={`self-start px-2 py-0.5 rounded-md ${record.riskLevel === "low" ? "bg-green-50" : "bg-orange-50"}`}
            >
              <Text
                className={`text-xs font-bold ${record.riskLevel === "low" ? "text-green-700" : "text-orange-700"}`}
              >
                위험도 {record.riskLevel === "low" ? "낮음" : "보통"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const MenuItem = ({
    icon: Icon,
    label,
    color,
    onPress,
    isDestructive = false,
  }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between p-4 bg-white border-b border-slate-50 last:border-b-0 active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center ${isDestructive ? "bg-red-50" : "bg-slate-50"}`}
        >
          <Icon
            size={16}
            color={isDestructive ? "#ef4444" : color || "#64748b"}
          />
        </View>
        <Text
          className={`font-medium ${isDestructive ? "text-red-500" : "text-slate-700"}`}
        >
          {label}
        </Text>
      </View>
      <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Minimal Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 dark:border-slate-800 z-10">
          <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">
            마이페이지
          </Text>
          <TouchableOpacity>
            <Settings size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {/* Profile Card */}
          <View className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm mb-6 flex-row items-center gap-5">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center border-2 border-white shadow-sm">
              <User size={32} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-800 mb-0.5">
                {user?.name}
              </Text>
              <Text className="text-sm text-slate-400">{user?.email}</Text>
              <View className="flex-row mt-3 gap-2">
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-blue-600">
                    건강점수 75점
                  </Text>
                </View>
                <View className="bg-slate-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-slate-500">
                    관리 12일차
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Group 1 */}
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">
            계정 및 설정
          </Text>
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <MenuItem
              icon={Palette}
              label="테마 변경"
              color="#8b5cf6"
              onPress={() => navigation.navigate("ThemeSelector")}
            />
            <MenuItem
              icon={Bell}
              label="알림 설정"
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <MenuItem
              icon={Heart}
              label="찜한 병원"
              color="#ef4444"
              onPress={() =>
                navigation.navigate("Hospitals", { tab: "favorites" })
              }
            />
            <MenuItem
              icon={MessageSquare}
              label="내 게시글 관리"
              color="#0ea5e9"
              onPress={() =>
                navigation.navigate("Community", { view: "myPosts" })
              }
            />
            <MenuItem
              icon={ThumbsUp}
              label="좋아요한 게시글 보기"
              color="#f59e0b"
              onPress={() =>
                navigation.navigate("Community", { view: "liked" })
              }
            />
          </View>

          {/* Menu Group 2 */}
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">
            고객 지원
          </Text>
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <MenuItem
              icon={HelpCircle}
              label="고객센터"
              onPress={() => navigation.navigate("CustomerService")}
            />
            <MenuItem
              icon={Shield}
              label="약관 및 정책"
              onPress={() => navigation.navigate("TermsPolicies")}
            />
          </View>

          {/* Health Records (Preview) */}
          <View className="flex-row items-center justify-between mb-3 ml-1">
            <Text className="text-lg font-bold text-slate-800">최근 기록</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-blue-500">전체보기</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-8">
            {healthRecords.slice(0, 2).map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </View>

          {/* Logout Group */}
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <MenuItem icon={LogOut} label="로그아웃" onPress={signOut} />
            <MenuItem
              icon={AlertCircle}
              label="회원탈퇴"
              isDestructive
              onPress={handleDeleteAccount}
            />
          </View>

          <View className="items-center">
            <Text className="text-xs text-slate-300">버전 1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
