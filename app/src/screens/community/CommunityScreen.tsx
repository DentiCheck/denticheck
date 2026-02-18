import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Share,
  Platform,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  Search,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Package,
  Hospital as LucideHospital,
  Trash2,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@apollo/client/react";
import { GET_POSTS, CREATE_POST, DELETE_POST, TOGGLE_POST_LIKE } from "../../graphql/queries";

import { useColorScheme } from "nativewind";

import { Button } from "../../shared/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../../shared/components/ui/Tabs";
import { useColorTheme } from "../../shared/providers/ColorThemeProvider";
import { useInfiniteScroll } from "../../shared/hooks/useInfiniteScroll";
import { InfiniteScrollView } from "../../shared/components/InfiniteScrollView";
import { PostFormModal, type PostFormSubmitPayload } from "./PostFormModal";
import { BASE_URL, SHARE_WEB_BASE_URL } from "../../shared/lib/constants";
import * as SecureStore from "expo-secure-store";

type PostType = "all" | "product" | "hospital";

type Post = {
  id: string;
  author: string;
  authorInitial: string;
  content: string;
  images?: string[];
  tags: { type: "product" | "hospital"; name: string }[];
  likes: number;
  comments: number;
  createdAt: Date | string;
  isLiked?: boolean;
  postType?: string | null;
  isMine?: boolean;
};

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const scrollToPostId = (route.params as { scrollToPostId?: string } | undefined)?.scrollToPostId;
  const listRef = useRef<any>(null);
  const didScrollToPostRef = useRef<string | null>(null);

  const { theme } = useColorTheme();
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [likeOverrides, setLikeOverrides] = useState<Record<string, { isLiked: boolean; likeCount: number }>>({});

  type RawPostItem = {
    id: string;
    author: string;
    authorInitial: string;
    content: string;
    images?: string[];
    tags: Array<{ type: string; name: string }>;
    likes: number;
    comments: number;
    createdAt: string | null;
    postType: string | null;
    isMine: boolean;
    isLiked: boolean;
  };

  const {
    items: rawPosts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refetch: refetchPosts,
    error,
  } = useInfiniteScroll<{ posts: RawPostItem[] }, RawPostItem>({
    query: GET_POSTS,
    pageSize: 10,
    parseItems: (data) => data.posts,
    getItemId: (item) => item.id,
    baseVariables: {
      postType: selectedTab === "all" ? null : selectedTab,
    },
    resetKey: selectedTab,
  });

  // refetch 함수를 ref로 저장하여 최신 함수 참조
  const refetchPostsRef = useRef(refetchPosts);
  useEffect(() => {
    refetchPostsRef.current = refetchPosts;
  }, [refetchPosts]);

  // 탭에 다시 들어올 때 목록 새로고침 (추가/삭제 반영)
  useFocusEffect(
    React.useCallback(() => {
      // 약간의 지연을 두어 화면이 완전히 포커스된 후 실행
      const timer = setTimeout(() => {
        refetchPostsRef.current();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const posts: Post[] = rawPosts.map((p) => {
    const over = likeOverrides[p.id];
    return {
      id: p.id,
      author: p.author,
      authorInitial: p.authorInitial,
      content: p.content,
      images: p.images ?? [],
      tags: (p.tags ?? []).map((t) => ({
        type: t.type as "product" | "hospital",
        name: t.name,
      })),
      likes: over?.likeCount ?? p.likes ?? 0,
      comments: p.comments ?? 0,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      postType: p.postType ?? undefined,
      isMine: p.isMine ?? false,
      isLiked: over?.isLiked ?? p.isLiked ?? false,
    };
  });

  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);

  const togglePostExpand = (postId: string) => {
    setExpandedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const [createPost, { loading: createLoading }] = useMutation(CREATE_POST, {
    onCompleted: () => {
      refetchPostsRef.current();
      setShowCreateDialog(false);
    },
  });

  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST, {
    onCompleted: () => {
      refetchPostsRef.current();
    },
  });

  const [togglePostLike] = useMutation<{
    togglePostLike: { isLiked: boolean; likeCount: number };
  }>(TOGGLE_POST_LIKE, {
    update(cache, { data }, { variables }) {
      if (!data?.togglePostLike || !variables?.postId) return;
      const existing = cache.readQuery<{ posts: Array<{ id: string; likes: number; isLiked: boolean }> }>({
        query: GET_POSTS,
      });
      if (!existing?.posts) return;
      cache.writeQuery({
        query: GET_POSTS,
        data: {
          posts: existing.posts.map((p) =>
            p.id === variables.postId
              ? { ...p, likes: data.togglePostLike.likeCount, isLiked: data.togglePostLike.isLiked }
              : p
          ),
        },
      });
    },
  });

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await togglePostLike({ variables: { postId } });
      const result = res.data?.togglePostLike;
      if (result)
        setLikeOverrides((prev) => ({ ...prev, [postId]: { isLiked: result.isLiked, likeCount: result.likeCount } }));
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "좋아요 처리에 실패했어요.";
      Alert.alert("알림", msg);
    }
  };

  /** 서버에 이미지 1장 업로드 후 접근 URL 반환 */
  const uploadCommunityImage = async (localUri: string): Promise<string> => {
    const token = await SecureStore.getItemAsync("accessToken");
    const formData = new FormData();
    formData.append("file", {
      uri: localUri,
      name: "image.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    const res = await fetch(`${BASE_URL}/api/community/upload-image`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `업로드 실패 (${res.status})`);
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  const handleSubmitPostForm = async (data: PostFormSubmitPayload) => {
    try {
      let imageUrls: string[] | null = null;
      if (data.images?.length) {
        imageUrls = [];
        for (const img of data.images) {
          const url = await uploadCommunityImage(img.uri);
          imageUrls.push(url);
        }
      }
      await createPost({
        variables: {
          input: {
            content: data.content,
            postType: data.postType,
            dentalIds: data.dentalIds.length > 0 ? data.dentalIds : null,
            imageUrls,
          },
        },
      });
      Alert.alert("작성 완료", "게시글이 성공적으로 등록되었습니다.");
    } catch (e: unknown) {
      const message =
        (e as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message ??
        (e instanceof Error ? e.message : null) ??
        "게시글 등록에 실패했습니다.";
      Alert.alert("등록 실패", message);
    }
  };

  // 탭 필터는 서버에서 postType으로 조회함. 검색만 클라이언트 필터
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    return (
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // 공유 링크로 들어온 경우: 해당 게시글 위치로 스크롤
  useEffect(() => {
    if (!scrollToPostId || !filteredPosts.length || didScrollToPostRef.current === scrollToPostId) return;
    const index = filteredPosts.findIndex((p) => p.id === scrollToPostId);
    if (index < 0) return;
    didScrollToPostRef.current = scrollToPostId;
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.2 });
      } catch (_) {
        // 레이아웃 미측정 시 등 실패해도 무시
      }
      navigation.setParams?.({ scrollToPostId: undefined });
    }, 500);
    return () => clearTimeout(t);
  }, [scrollToPostId, filteredPosts, navigation]);

  const getTimeAgo = (date: Date | string) => {
    let d: Date;
    if (typeof date === "string") {
      const s = date.trim();
      if (!s) d = new Date();
      else if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) d = new Date(s + "Z");
      else d = new Date(s);
    } else {
      d = date;
    }
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const postTypeLabel = (postType: string | null | undefined) => {
    if (!postType || postType === "all") return null;
    if (postType === "product") return { label: "상품후기", icon: Package, bg: "bg-indigo-50", text: "text-indigo-600" };
    if (postType === "hospital") return { label: "병원후기", icon: LucideHospital, bg: "bg-blue-50", text: "text-blue-600" };
    return null;
  };

  /** 서버가 localhost URL을 반환한 경우 앱이 접근 가능한 BASE_URL로 치환 (에뮬/실기에서 이미지 로드용) */
  const resolveImageUrl = (url: string): string => {
    if (!url?.trim()) return url;
    try {
      const u = new URL(url);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        const base = new URL(BASE_URL);
        return base.origin + u.pathname + (u.search || "");
      }
    } catch (_) {}
    return url;
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "게시글 삭제",
      "이 게시글을 삭제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost({ variables: { id: postId } });
              Alert.alert("삭제됨", "게시글이 삭제되었습니다.");
            } catch (e) {
              const msg = (e as { message?: string })?.message ?? "삭제에 실패했습니다.";
              Alert.alert("삭제 실패", msg);
            }
          },
        },
      ]
    );
  };

  const handleSharePost = async (post: Post) => {
    try {
      // 게시글 내용 요약 (최대 100자)
      const contentPreview = post.content.length > 100 
        ? post.content.substring(0, 100) + "..." 
        : post.content;
      
      // 웹 URL 사용 (http/https라 메시지 앱에서 하이퍼링크로 인식됨)
      const postUrl = `${SHARE_WEB_BASE_URL.replace(/\/$/, "")}/community/post/${post.id}`;
      
      // 공유할 메시지 구성
      const shareMessage = `${post.author}님의 게시글\n\n${contentPreview}\n\n게시글 보기: ${postUrl}\n\n#DentiCheck`;
      
      const result = await Share.share(
        Platform.OS === 'ios'
          ? {
              message: shareMessage,
              url: postUrl,
              title: "게시글 공유",
            }
          : {
              message: shareMessage,
              title: "게시글 공유",
            }
      );

      if (result.action === Share.sharedAction) {
        // 공유 성공
      } else if (result.action === Share.dismissedAction) {
        // 공유 취소
      }
    } catch (error) {
      Alert.alert("공유 실패", "게시글을 공유하는 중 오류가 발생했습니다.");
    }
  };

  const MAX_PREVIEW_LINES = 10;

  const PostCard = ({
    post,
    onDelete,
    isExpanded,
    onToggleExpand,
  }: {
    post: Post;
    onDelete: (postId: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
  }) => {
    const lines = (post.content ?? "").split("\n");
    const isLong = lines.length > MAX_PREVIEW_LINES;
    const showPreview = isLong && !isExpanded;
    const displayContent = showPreview
      ? lines.slice(0, MAX_PREVIEW_LINES).join("\n")
      : post.content ?? "";
    return (
    <View className="p-5 mb-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center border border-slate-200 dark:border-slate-600">
          <Text className="font-bold text-slate-600 dark:text-slate-300">{post.authorInitial}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-slate-800 dark:text-white text-[15px]">
            {post.author}
          </Text>
          <Text className="text-xs text-slate-400 font-medium">
            {getTimeAgo(post.createdAt)}
          </Text>
        </View>
        {postTypeLabel(post.postType) && (() => {
          const typeInfo = postTypeLabel(post.postType)!;
          const Icon = typeInfo.icon;
          return (
            <View className={`flex-row items-center px-2.5 py-1 rounded-lg ${typeInfo.bg}`}>
              <Icon size={12} color={post.postType === "product" ? "#4f46e5" : "#2563eb"} />
              <Text className={`ml-1 text-xs font-bold ${typeInfo.text}`}>
                {typeInfo.label}
              </Text>
            </View>
          );
        })()}
      </View>

      <TouchableOpacity
        activeOpacity={isLong ? 0.7 : 1}
        onPress={isLong ? onToggleExpand : undefined}
        className="mb-4"
      >
        <Text className="text-slate-700 dark:text-slate-200 leading-6 text-[15px] p-1">
          {displayContent}
        </Text>
        {showPreview && (
          <Text className="text-slate-500 dark:text-slate-400 text-[15px] p-1 mt-0.5 font-bold">
            더보기...
          </Text>
        )}
        {isLong && isExpanded && (
          <Text className="text-slate-500 dark:text-slate-400 text-[14px] p-1 mt-1 font-bold">
            접기
          </Text>
        )}
      </TouchableOpacity>

      {post.images && post.images.length > 0 && (
        <View className="mt-3 mb-4 rounded-xl overflow-hidden gap-1">
          {post.images.length === 1 && (
            <Image
              source={{ uri: resolveImageUrl(post.images[0]) }}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-700"
              style={{ aspectRatio: 4 / 3 }}
              resizeMode="cover"
            />
          )}
          {post.images.length === 2 && (
            <View className="flex-row gap-1">
              <Image
                source={{ uri: resolveImageUrl(post.images[0]) }}
                className="flex-1 rounded-l-xl bg-slate-100 dark:bg-slate-700"
                style={{ aspectRatio: 1 }}
                resizeMode="cover"
              />
              <Image
                source={{ uri: resolveImageUrl(post.images[1]) }}
                className="flex-1 rounded-r-xl bg-slate-100 dark:bg-slate-700"
                style={{ aspectRatio: 1 }}
                resizeMode="cover"
              />
            </View>
          )}
          {post.images.length === 3 && (
            <View className="flex-row gap-1">
              <Image
                source={{ uri: resolveImageUrl(post.images[0]) }}
                className="rounded-l-xl bg-slate-100 dark:bg-slate-700"
                style={{ flex: 1, aspectRatio: 1 }}
                resizeMode="cover"
              />
              <View className="flex-1 gap-1">
                <Image
                  source={{ uri: resolveImageUrl(post.images[1]) }}
                  className="flex-1 rounded-tr-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
                <Image
                  source={{ uri: resolveImageUrl(post.images[2]) }}
                  className="flex-1 rounded-br-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
              </View>
            </View>
          )}
          {post.images.length === 4 && (
            <View className="gap-1">
              <View className="flex-row gap-1">
                <Image
                  source={{ uri: resolveImageUrl(post.images[0]) }}
                  className="flex-1 rounded-tl-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
                <Image
                  source={{ uri: resolveImageUrl(post.images[1]) }}
                  className="flex-1 rounded-tr-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
              </View>
              <View className="flex-row gap-1">
                <Image
                  source={{ uri: resolveImageUrl(post.images[2]) }}
                  className="flex-1 rounded-bl-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
                <Image
                  source={{ uri: resolveImageUrl(post.images[3]) }}
                  className="flex-1 rounded-br-xl bg-slate-100 dark:bg-slate-700"
                  style={{ aspectRatio: 1 }}
                  resizeMode="cover"
                />
              </View>
            </View>
          )}
        </View>
      )}

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
            onPress={() => handleToggleLike(post.id)}
            className="flex-row items-center gap-1.5"
          >
            <Heart
              size={20}
              color={post.isLiked ? "#ef4444" : "#94a3b8"}
              fill={post.isLiked ? "#ef4444" : "transparent"}
            />
            <Text
              className={`text-sm font-medium ${post.isLiked ? "text-red-500" : "text-slate-500"}`}
            >
              {post.likes}
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
        <View className="flex-row items-center gap-3">
          {post.isMine && (
            <TouchableOpacity onPress={() => onDelete(post.id)} disabled={deleteLoading}>
              <Trash2 size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleSharePost(post)}>
            <Share2 size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  };

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
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={theme?.primary ?? "#3b82f6"} />
            <Text className="mt-3 text-slate-500">게시글을 불러오는 중...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <Text className="text-center text-red-500">
              게시글을 불러오지 못했어요.
            </Text>
            <Text className="mt-2 text-center text-slate-500 text-sm">
              {error.message}
            </Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <MessageCircle size={48} color="#cbd5e1" />
            <Text className="mt-4 text-center text-slate-600 font-medium">
              아직 게시글이 없어요
            </Text>
            <Text className="mt-2 text-center text-slate-400 text-sm">
              첫 번째 글을 작성해 보세요.
            </Text>
          </View>
        ) : (
          <InfiniteScrollView<Post>
            listRef={listRef}
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item: post }) => (
              <PostCard
                post={post}
                onDelete={handleDeletePost}
                isExpanded={expandedPostIds.includes(post.id)}
                onToggleExpand={() => togglePostExpand(post.id)}
              />
            )}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            loadingColor={theme?.primary ?? "#3b82f6"}
          />
        )}

        <PostFormModal
          visible={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleSubmitPostForm}
          submitLoading={createLoading}
          title="글쓰기"
        />
      </SafeAreaView>
    </View>
  );
}
