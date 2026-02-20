import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Search, Plus, ChevronLeft } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Tabs, TabsList, TabsTrigger } from "../../shared/components/ui/Tabs";

export type CommunityHeaderProps = {
  isSpecialView: boolean;
  isMyPostsView: boolean;
  isLikedView: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedTab: string;
  onTabChange: (value: string) => void;
  onOpenCreate: () => void;
};

export function CommunityHeader({
  isSpecialView,
  isMyPostsView,
  isLikedView,
  searchQuery,
  onSearchChange,
  selectedTab,
  onTabChange,
  onOpenCreate,
}: CommunityHeaderProps) {
  const navigation = useNavigation<any>();
  const { colorScheme } = useColorScheme();

  return (
    <>
      {/* Minimal Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-border dark:border-slate-800 bg-background dark:bg-slate-900 z-10">
        {isSpecialView ? (
          <TouchableOpacity
            onPress={() => {
              try {
                navigation.setParams({ view: undefined });
              } catch {
                navigation.navigate("Main", { screen: "Community", params: {} });
              }
            }}
            className="flex-row items-center gap-1 active:opacity-70 z-[1]"
            style={{ zIndex: 10 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft
              size={22}
              color={colorScheme === "dark" ? "#fff" : "#1e293b"}
            />
            <Text className="text-base font-semibold text-slate-700 dark:text-slate-200">
              Community
            </Text>
          </TouchableOpacity>
        ) : null}
        <Text
          className={`text-2xl font-extrabold text-slate-800 dark:text-white ${isSpecialView ? "absolute left-0 right-0 text-center z-0" : ""}`}
          pointerEvents="none"
        >
          {isMyPostsView ? "My Posts" : isLikedView ? "Liked Posts" : "Community"}
        </Text>
        {isSpecialView ? <View className="w-24" /> : null}
        {!isSpecialView ? (
          <TouchableOpacity
            onPress={onOpenCreate}
            className="w-9 h-9 bg-slate-900 dark:bg-white rounded-full items-center justify-center"
            style={{
              elevation: 10,
              shadowColor: "#e2e8f0",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}
          >
            <Plus
              size={20}
              color={colorScheme === "dark" ? "black" : "white"}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Sub Header (Search & Tabs) */}
      <View className="bg-background dark:bg-slate-900 pb-2">
        <View className="px-6 py-2">
          <View className="bg-white dark:bg-slate-800 h-11 rounded-2xl flex-row items-center px-4 border border-slate-200 dark:border-slate-700">
            <Search size={18} color="#94a3b8" />
            <TextInput
              placeholder={
                isMyPostsView
                  ? "Search my posts"
                  : isLikedView
                    ? "Search liked posts"
                    : "Search topics of interest"
              }
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={onSearchChange}
              className="flex-1 ml-3 text-base text-slate-800 dark:text-white h-full"
            />
          </View>
        </View>

        {!isSpecialView && (
          <Tabs
            value={selectedTab}
            onValueChange={onTabChange}
            className="px-6 mt-2"
          >
            <TabsList className="bg-slate-200/50 p-1 rounded-xl h-10 w-full flex-row">
              <TabsTrigger
                value="all"
                className={`flex-1 rounded-lg ${selectedTab === "all" ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selectedTab === "all" ? "text-slate-800" : "text-slate-500"}`}
                >
                  All
                </Text>
              </TabsTrigger>
              <TabsTrigger
                value="product"
                className={`flex-1 rounded-lg ${selectedTab === "product" ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selectedTab === "product" ? "text-slate-800" : "text-slate-500"}`}
                >
                  Product Reviews
                </Text>
              </TabsTrigger>
              <TabsTrigger
                value="hospital"
                className={`flex-1 rounded-lg ${selectedTab === "hospital" ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selectedTab === "hospital" ? "text-slate-800" : "text-slate-500"}`}
                >
                  Clinic Reviews
                </Text>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </View>
    </>
  );
}
