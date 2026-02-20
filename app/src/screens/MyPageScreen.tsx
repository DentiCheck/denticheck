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
      summary: "Observed tartar and gum inflammation",
    },
    {
      id: "2",
      date: new Date("2026-02-01"),
      type: "survey",
      score: 75,
      summary: "Overall good, flossing recommended",
    },
    {
      id: "3",
      date: new Date("2026-01-28"),
      type: "note",
      summary: "Gum bleeding present",
      note: "Recorded slight bleeding after brushing",
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? All data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
                ? "AI Analysis"
                : record.type === "survey"
                  ? "Health Survey"
                  : "Note"}{" "}
              • {record.date.toLocaleDateString()}
            </Text>
          </View>
          <Text className="font-bold text-slate-800 text-sm mb-1.5">
            {record.summary}
          </Text>

          {record.score && (
            <View className="self-start bg-violet-50 px-2 py-0.5 rounded-md">
              <Text className="text-xs font-bold text-violet-700">
                Score {record.score}
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
                Risk {record.riskLevel === "low" ? "Low" : "Med"}
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
            My Profile
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
                    Health Score 75
                  </Text>
                </View>
                <View className="bg-slate-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-slate-500">
                    Day 12
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Group 1 */}
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">
            Account & Settings
          </Text>
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <MenuItem
              icon={Palette}
              label="Change Theme"
              color="#8b5cf6"
              onPress={() => navigation.navigate("ThemeSelector")}
            />
            <MenuItem
              icon={Bell}
              label="Notification Settings"
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <MenuItem
              icon={Heart}
              label="Saved Hospitals"
              color="#ef4444"
              onPress={() =>
                navigation.navigate("Main", {
                  screen: "DentalSearch",
                  params: { tab: "favorites" },
                })
              }
            />
            <MenuItem
              icon={MessageSquare}
              label="My Posts"
              color="#0ea5e9"
              onPress={() =>
                navigation.navigate("Community", { view: "myPosts" })
              }
            />
            <MenuItem
              icon={ThumbsUp}
              label="Liked Posts"
              color="#f59e0b"
              onPress={() =>
                navigation.navigate("Community", { view: "liked" })
              }
            />
          </View>

          {/* Menu Group 2 */}
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">
            Support
          </Text>
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <MenuItem
              icon={HelpCircle}
              label="Help Center"
              onPress={() => navigation.navigate("CustomerService")}
            />
            <MenuItem
              icon={Shield}
              label="Terms & Policies"
              onPress={() => navigation.navigate("TermsPolicies")}
            />
          </View>

          {/* Health Records (Preview) */}
          <View className="flex-row items-center justify-between mb-3 ml-1">
            <Text className="text-lg font-bold text-slate-800">Recent Records</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-blue-500">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-8">
            {healthRecords.slice(0, 2).map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </View>

          {/* Logout Group */}
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <MenuItem icon={LogOut} label="Logout" onPress={signOut} />
            <MenuItem
              icon={AlertCircle}
              label="Delete Account"
              isDestructive
              onPress={handleDeleteAccount}
            />
          </View>

          <View className="items-center">
            <Text className="text-xs text-slate-300">Version 1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
