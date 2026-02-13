import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Search,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Package,
  Hospital as LucideHospital,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorScheme } from "nativewind";

import { Button } from "../shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../shared/components/ui/Tabs";
import { useColorTheme } from "../shared/providers/ColorThemeProvider";

type Post = {
  id: string;
  author: string;
  authorInitial: string;
  content: string;
  images?: string[];
  tags: { type: "product" | "hospital"; name: string }[];
  likes: number;
  comments: number;
  createdAt: Date;
  isLiked?: boolean;
};

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useColorTheme();
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [formData, setFormData] = useState({
    content: "",
    tags: [] as { type: "product" | "hospital"; name: string }[],
  });

  // Mock Posts Data
  const posts: Post[] = [
    {
      id: "1",
      author: "홍길동",
      authorInitial: "홍",
      content:
        "스케일링 받고 왔어요! 스마일 치과 정말 친절하시고 꼼꼼하게 해주셔서 만족스러워요 👍",
      tags: [{ type: "hospital", name: "스마일 치과의원" }],
      likes: 24,
      comments: 8,
      createdAt: new Date("2026-02-03T10:30:00"),
      isLiked: false,
    },
    {
      id: "2",
      author: "김영희",
      authorInitial: "김",
      content:
        "치실 사용 시작한 지 한 달 됐는데 잇몸 출혈이 많이 줄었어요. 프리미엄 치실 강추합니다!",
      tags: [{ type: "product", name: "프리미엄 치실" }],
      likes: 56,
      comments: 15,
      createdAt: new Date("2026-02-02T15:20:00"),
      isLiked: true,
    },
    {
      id: "3",
      author: "박철수",
      authorInitial: "박",
      content:
        "AI 체크 기능 써봤는데 생각보다 정확하네요. 치과 가기 전에 미리 확인해볼 수 있어서 좋아요!",
      tags: [],
      likes: 32,
      comments: 12,
      createdAt: new Date("2026-02-01T09:15:00"),
      isLiked: false,
    },
  ];

  const [likedPosts, setLikedPosts] = useState<string[]>(
    posts.filter((p) => p.isLiked).map((p) => p.id),
  );

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId],
    );
  };

  const handleCreatePost = () => {
    setShowCreateDialog(false);
    setFormData({ content: "", tags: [] });
    Alert.alert("작성 완료", "게시글이 성공적으로 등록되었습니다.");
  };

  const addTag = (type: "product" | "hospital", name: string) => {
    if (!formData.tags.find((t) => t.type === type && t.name === name)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, { type, name }],
      });
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      selectedTab === "all" ||
      (selectedTab === "product" &&
        post.tags.some((t) => t.type === "product")) ||
      (selectedTab === "hospital" &&
        post.tags.some((t) => t.type === "hospital"));
    return matchesSearch && matchesTab;
  });

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const PostCard = ({ post }: { post: Post }) => (
    <View className="p-5 mb-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
          <Text className="font-bold text-slate-600">{post.authorInitial}</Text>
        </View>
        <View>
          <Text className="font-bold text-slate-800 text-[15px]">
            {post.author}
          </Text>
          <Text className="text-xs text-slate-400 font-medium">
            {getTimeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <Text className="text-slate-700 mb-4 leading-6 text-[15px] p-1">
        {post.content}
      </Text>

      {post.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {post.tags.map((tag, idx) => (
            <View
              key={idx}
              className={`flex-row items-center px-2 py-1 rounded-md ${
                tag.type === "product" ? "bg-indigo-50" : "bg-blue-50"
              }`}
            >
              {tag.type === "product" ? (
                <Package size={12} color="#4f46e5" />
              ) : (
                <LucideHospital size={12} color="#2563eb" />
              )}
              <Text
                className={`ml-1 text-xs font-bold ${
                  tag.type === "product" ? "text-indigo-600" : "text-blue-600"
                }`}
              >
                {tag.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between pt-3 border-t border-slate-50">
        <View className="flex-row gap-6">
          <TouchableOpacity
            onPress={() => toggleLike(post.id)}
            className="flex-row items-center gap-1.5"
          >
            <Heart
              size={20}
              color={likedPosts.includes(post.id) ? "#ef4444" : "#94a3b8"}
              fill={likedPosts.includes(post.id) ? "#ef4444" : "transparent"}
            />
            <Text
              className={`text-sm font-medium ${likedPosts.includes(post.id) ? "text-red-500" : "text-slate-500"}`}
            >
              {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() =>
              navigation.navigate("CommentList", { postId: post.id })
            }
          >
            <MessageCircle size={20} color="#94a3b8" />
            <Text className="text-sm font-medium text-slate-500">
              {post.comments}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Share2 size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Minimal Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 z-10">
          <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">
            커뮤니티
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreateDialog(true)}
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
        </View>

        {/* Sub Header (Search & Tabs) */}
        <View className="bg-gray-50 dark:bg-slate-900 pb-2">
          <View className="px-6 py-2">
            <View className="bg-white dark:bg-slate-800 h-11 rounded-2xl flex-row items-center px-4 border border-slate-200 dark:border-slate-700">
              <Search size={18} color="#94a3b8" />
              <TextInput
                placeholder="관심있는 내용을 검색해보세요"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-base text-slate-800 dark:text-white h-full"
              />
            </View>
          </View>

          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
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
                  전체
                </Text>
              </TabsTrigger>
              <TabsTrigger
                value="product"
                className={`flex-1 rounded-lg ${selectedTab === "product" ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selectedTab === "product" ? "text-slate-800" : "text-slate-500"}`}
                >
                  상품후기
                </Text>
              </TabsTrigger>
              <TabsTrigger
                value="hospital"
                className={`flex-1 rounded-lg ${selectedTab === "hospital" ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selectedTab === "hospital" ? "text-slate-800" : "text-slate-500"}`}
                >
                  병원후기
                </Text>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ScrollView>

        {/* Create Post Modal */}
        <Modal visible={showCreateDialog} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-gray-50 dark:bg-slate-900 rounded-t-[32px] h-[85%] p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-800 dark:text-white">
                  글쓰기
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateDialog(false)}
                  className="w-8 h-8 items-center justify-center bg-slate-200 rounded-full"
                >
                  <X size={16} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1">
                <View className="mb-6">
                  <TextInput
                    multiline
                    placeholder="어떤 이야기를 나누고 싶으신가요?"
                    placeholderTextColor="#94a3b8"
                    value={formData.content}
                    onChangeText={(text) =>
                      setFormData({ ...formData, content: text })
                    }
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl h-48 text-base text-slate-800 dark:text-white leading-6 border border-slate-200"
                    textAlignVertical="top"
                  />
                </View>

                <View>
                  <Text className="text-sm font-bold text-slate-500 mb-3 ml-1">
                    태그 추가
                  </Text>
                  <View className="flex-row gap-3 mb-4">
                    <TouchableOpacity
                      onPress={() => addTag("product", "프리미엄 치실")}
                      className="flex-row items-center bg-white border border-slate-200 px-3 py-2 rounded-xl"
                    >
                      <Package
                        size={16}
                        color="#475569"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-sm font-medium text-slate-600">
                        상품 태그
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => addTag("hospital", "스마일 치과의원")}
                      className="flex-row items-center bg-white border border-slate-200 px-3 py-2 rounded-xl"
                    >
                      <LucideHospital
                        size={16}
                        color="#475569"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-sm font-medium text-slate-600">
                        치과 태그
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    {formData.tags.map((tag, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => removeTag(idx)}
                        className={`flex-row items-center pl-3 pr-2 py-1.5 rounded-full ${
                          tag.type === "product"
                            ? "bg-indigo-100"
                            : "bg-blue-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold mr-1 ${
                            tag.type === "product"
                              ? "text-indigo-700"
                              : "text-blue-700"
                          }`}
                        >
                          {tag.name}
                        </Text>
                        <X
                          size={12}
                          color={tag.type === "product" ? "#4338ca" : "#1d4ed8"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <Button
                onPress={handleCreatePost}
                size="lg"
                className="rounded-full mt-4"
                style={{
                  elevation: 10,
                  shadowColor: "#3b82f6",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                }}
              >
                <Text className="font-bold text-white text-lg">등록하기</Text>
              </Button>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
