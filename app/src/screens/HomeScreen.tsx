import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Shield, Camera, ChevronRight, Zap, Target } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorTheme } from "../shared/providers/ColorThemeProvider";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useColorTheme();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header Title Only */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Denti<Text style={{ color: theme.primary }}>Check</Text>
          </Text>
        </View>

        {/* Main Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        >
          <View className="px-6 space-y-8">
            {/* 1. Feature Cards (AI Check & Hospital Search) - Premium Cards */}
            <View className="flex-row gap-4 h-48">
              <TouchableOpacity
                className="flex-1"
                onPress={() => navigation.navigate("AICheck")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.primary, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-1 rounded-[24px] p-5 justify-between"
                  style={{
                    elevation: 10,
                    shadowColor: "#3b82f6",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                  }}
                >
                  <View className="bg-white/20 self-start p-3 rounded-2xl w-12 h-12 items-center justify-center backdrop-blur-md">
                    <Camera size={24} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg leading-tight mb-1">
                      AI 구강 체크
                    </Text>
                    <Text className="text-white/80 text-xs font-medium">
                      사진 촬영 한 번으로{"\n"}내 치아 상태 분석
                    </Text>
                  </View>
                  <View className="absolute top-4 right-4 opacity-20 transform rotate-12">
                    <Target size={60} color="white" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1"
                onPress={() => navigation.navigate("Hospitals")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#C4B5FD"]} // Violet gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-1 rounded-[24px] p-5 justify-between"
                  style={{
                    elevation: 10,
                    shadowColor: "#8b5cf6",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                  }}
                >
                  <View className="bg-white/20 self-start p-3 rounded-2xl w-12 h-12 items-center justify-center backdrop-blur-md">
                    <Shield size={24} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg leading-tight mb-1">
                      병원 찾기
                    </Text>
                    <Text className="text-white/80 text-xs font-medium">
                      내 위치 기반{"\n"}가까운 치과 검색
                    </Text>
                  </View>
                  <View className="absolute top-4 right-4 opacity-20 transform -rotate-12">
                    <Shield size={60} color="white" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* 2. Recommended Products (Horizontal Scroll) */}
            <View>
              <View className="flex-row items-center justify-between mb-4 px-1">
                <Text className="font-bold text-xl text-slate-800 dark:text-white">
                  추천 상품
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate("RecommendedProducts")}
                >
                  <Text className="text-xs text-slate-500 font-medium mr-1">
                    전체보기
                  </Text>
                  <ChevronRight size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-6 px-6"
                contentContainerStyle={{ paddingRight: 24 }}
              >
                {[
                  {
                    name: "덴티마스터 치실",
                    detail: "치간 케어 필수품",
                    price: "12,900원",
                    tag: "BEST",
                    color: "bg-teal-50",
                    iconColor: "text-teal-600",
                  },
                  {
                    name: "센서티브 치약",
                    detail: "시린이 완화 효과",
                    price: "8,500원",
                    tag: "SALE",
                    color: "bg-rose-50",
                    iconColor: "text-rose-600",
                  },
                  {
                    name: "음파 전동 칫솔",
                    detail: "분당 3만회 진동",
                    price: "45,000원",
                    tag: "HOT",
                    color: "bg-indigo-50",
                    iconColor: "text-indigo-600",
                  },
                ].map((product, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    className="mr-4 w-40"
                  >
                    <View className="bg-white dark:bg-slate-800 rounded-[20px] p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                      <View
                        className={`h-28 ${product.color} rounded-2xl items-center justify-center mb-3 relative`}
                      >
                        <Text
                          className={`font-bold text-2xl opacity-20 ${product.iconColor}`}
                        >
                          IMG
                        </Text>
                        <View className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <Text className="text-[10px] font-bold text-slate-800">
                            {product.tag}
                          </Text>
                        </View>
                      </View>
                      <View className="px-1 pb-1">
                        <Text className="font-bold text-sm text-slate-800 dark:text-white mb-0.5 line-clamp-1">
                          {product.name}
                        </Text>
                        <Text className="text-[10px] text-slate-400 mb-2 font-medium">
                          {product.detail}
                        </Text>
                        <View className="flex-row items-end justify-between">
                          <Text className="text-sm font-bold text-primary">
                            {product.price}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 3. Insurance Banner (Modern Gradient) */}
            <View>
              <Text className="font-bold text-xl text-slate-800 dark:text-white mb-4 px-1">
                보험 상품
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate("InsuranceProducts")}
              >
                <LinearGradient
                  colors={["#1e293b", "#334155"]} // Dark slate gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-[24px] p-6 flex-row items-center justify-between shadow-lg relative overflow-hidden"
                >
                  {/* Decorative circles */}
                  <View className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
                  <View className="absolute right-10 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />

                  <View className="z-10">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Zap size={16} color="#fbbf24" fill="#fbbf24" />
                      <Text className="text-amber-400 font-bold text-xs tracking-wider">
                        PREMIUM CARE
                      </Text>
                    </View>
                    <Text className="text-white font-bold text-lg mb-1">
                      치과 보험 완벽 가이드
                    </Text>
                    <Text className="text-slate-300 text-xs mb-4 max-w-[160px]">
                      복잡한 보험 약관, 나에게 꼭 맞는{"\n"}혜택만 골라서
                      확인하세요
                    </Text>
                    <View className="bg-white self-start px-4 py-2 rounded-full">
                      <Text className="text-slate-900 font-bold text-xs">
                        확인하기
                      </Text>
                    </View>
                  </View>
                  {/* Shield Icon needs to be somewhat constrained */}
                  <View className="absolute right-4 bottom-0 opacity-90">
                    {/* Using a simple View placeholder or Image if available. Shield icon is simpler */}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
