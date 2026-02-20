import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Share,
  Platform,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  Heart,
  MessageCircle,
  Share2,
  Package,
  Hospital as LucideHospital,
  Trash2,
  Pencil,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@apollo/client/react";
import { GET_POSTS, GET_POSTS_LIKED_BY_ME, GET_POSTS_BY_ME, CREATE_POST, UPDATE_POST, DELETE_POST, TOGGLE_POST_LIKE } from "../../graphql/queries";

import { Button } from "../../shared/components/ui/Button";
import { useColorTheme } from "../../shared/providers/ColorThemeProvider";
import { useInfiniteScroll } from "../../shared/hooks/useInfiniteScroll";
import { InfiniteScrollView } from "../../shared/components/InfiniteScrollView";
import { PostFormModal, type PostFormSubmitPayload, type PostFormInitialValues } from "./PostFormModal";
import { CommunityHeader } from "./CommunityHeader";
import { BASE_URL, SHARE_WEB_BASE_URL } from "../../shared/lib/constants";
import * as SecureStore from "expo-secure-store";

type PostType = "all" | "product" | "hospital";

type Post = {
  id: string;
  author: string;
  authorInitial: string;
  content: string;
  images?: string[];
  tags: { type: "product" | "hospital"; name: string; id?: string }[];
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
  const routeParams = route.params as { scrollToPostId?: string; view?: string } | undefined;
  const scrollToPostId = routeParams?.scrollToPostId;
  const viewMode = routeParams?.view;
  const isLikedView = viewMode === "liked";
  const isMyPostsView = viewMode === "myPosts";
  const isSpecialView = isLikedView || isMyPostsView;

  const listRef = useRef<any>(null);
  const didScrollToPostRef = useRef<string | null>(null);

  const { theme } = useColorTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [likeOverrides, setLikeOverrides] = useState<Record<string, { isLiked: boolean; likeCount: number }>>({});

  type RawPostItem = {
    id: string;
    author: string;
    authorInitial: string;
    content: string;
    images?: string[];
    tags: Array<{ type: string; name: string; id?: string }>;
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
  } = useInfiniteScroll<
    { posts: RawPostItem[]; postsLikedByMe?: RawPostItem[]; postsByMe?: RawPostItem[] },
    RawPostItem
  >({
    query: isMyPostsView ? GET_POSTS_BY_ME : isLikedView ? GET_POSTS_LIKED_BY_ME : GET_POSTS,
    pageSize: 10,
    parseItems: (data) =>
      isMyPostsView
        ? (data.postsByMe ?? [])
        : isLikedView
          ? (data.postsLikedByMe ?? [])
          : data.posts,
    getItemId: (item) => item.id,
    baseVariables: isSpecialView
      ? {}
      : { postType: selectedTab === "all" ? null : selectedTab },
    resetKey: isMyPostsView ? "myPosts" : isLikedView ? "liked" : selectedTab,
  });

  // Store refetch function in ref to reference the latest function
  const refetchPostsRef = useRef(refetchPosts);
  useEffect(() => {
    refetchPostsRef.current = refetchPosts;
  }, [refetchPosts]);

  // Refresh list when re-entering the tab (to reflect additions/deletions)
  useFocusEffect(
    React.useCallback(() => {
      // Execute after screen is fully focused with a slight delay
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
        ...(t.id != null ? { id: t.id } : {}),
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

  /** Post → Edit form initial values (PostFormModal initialValues) */
  /** If the server returns localhost URL or relative path, convert to absolute URL loadable by the app */
  const resolveImageUrl = (url: string): string => {
    if (!url?.trim()) return url;
    try {
      const u = new URL(url);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        const base = new URL(BASE_URL);
        return base.origin + u.pathname + (u.search || "");
      }
      return url;
    } catch {
      if (url.startsWith("/")) return BASE_URL.replace(/\/$/, "") + url;
      return url;
    }
  };

  const postToInitialValues = (post: Post): PostFormInitialValues => ({
    content: post.content ?? "",
    postType: (post.postType ?? "all") as "all" | "product" | "hospital",
    dentalIds: (post.tags ?? [])
      .filter((t): t is { type: "hospital"; name: string; id: string } => t.type === "hospital" && !!t.id)
      .map((t) => t.id),
    tags: (post.tags ?? []).map((t) => ({ type: t.type, name: t.name, id: t.id })),
    images: (post.images ?? []).map((uri) => ({ uri: resolveImageUrl(uri) })),
  });

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

  const [updatePost, { loading: updateLoading }] = useMutation(UPDATE_POST, {
    onCompleted: () => {
      refetchPostsRef.current();
      setEditingPost(null);
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
      if (result) {
        setLikeOverrides((prev) => ({ ...prev, [postId]: { isLiked: result.isLiked, likeCount: result.likeCount } }));
        if (isLikedView && !result.isLiked) refetchPostsRef.current();
      }
    } catch {
      // ignore
    }
  };

  /** Upload 1 image to server and return the access URL */
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
      throw new Error(body || `Upload failed (${res.status})`);
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
            dentalIds: data.dentalIds && data.dentalIds.length > 0 ? data.dentalIds : null,
            productIds: data.productIds && data.productIds.length > 0 ? data.productIds : null,
            imageUrls,
          },
        },
      });
      Alert.alert("Success", "Post has been successfully registered.");
    } catch (e: unknown) {
      const message =
        (e as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message ??
        (e instanceof Error ? e.message : null) ??
        "Failed to register the post.";
      Alert.alert("Failed", message);
    }
  };

  const handleUpdatePostForm = async (postId: string, data: PostFormSubmitPayload) => {
    try {
      let imageUrls: string[] = [];
      if (data.images?.length) {
        for (const img of data.images) {
          const uri = img.uri;
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            imageUrls.push(uri);
          } else {
            const url = await uploadCommunityImage(uri);
            imageUrls.push(url);
          }
        }
      }
      await updatePost({
        variables: {
          input: {
            id: postId,
            content: data.content,
            postType: data.postType,
            dentalIds: data.dentalIds && data.dentalIds.length > 0 ? data.dentalIds : null,
            productIds: data.productIds && data.productIds.length > 0 ? data.productIds : null,
            imageUrls,
          },
        },
      });
      Alert.alert("Success", "Post has been updated.");
    } catch (e: unknown) {
      const message =
        (e as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message ??
        (e instanceof Error ? e.message : null) ??
        "Failed to edit the post.";
      Alert.alert("Failed", message);
    }
  };

  // Tab filter is queried by postType from the server. Only search is client-side filtering.
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    return (
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // When entering via share link: scroll to the corresponding post position
  useEffect(() => {
    if (!scrollToPostId || !filteredPosts.length || didScrollToPostRef.current === scrollToPostId) return;
    const index = filteredPosts.findIndex((p) => p.id === scrollToPostId);
    if (index < 0) return;
    didScrollToPostRef.current = scrollToPostId;
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.2 });
      } catch (_) {
        // Ignore failures like when layout is not yet measured
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

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const postTypeLabel = (postType: string | null | undefined) => {
    if (!postType || postType === "all") return null;
    if (postType === "product") return { label: "Product Review", icon: Package, bg: "bg-indigo-50", text: "text-indigo-600" };
    if (postType === "hospital") return { label: "Clinic Review", icon: LucideHospital, bg: "bg-blue-50", text: "text-blue-600" };
    return null;
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Do you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost({ variables: { id: postId } });
              if (isMyPostsView) refetchPostsRef.current();
              Alert.alert("Deleted", "Post has been deleted.");
            } catch (e) {
              const msg = (e as { message?: string })?.message ?? "Failed to delete post.";
              Alert.alert("Delete Failed", msg);
            }
          },
        },
      ]
    );
  };

  const handleSharePost = async (post: Post) => {
    try {
      // Post content summary (max 100 chars)
      const contentPreview = post.content.length > 100
        ? post.content.substring(0, 100) + "..."
        : post.content;

      // Use web URL (recognized as hyperlink in messaging apps due to http/https)
      const postUrl = `${SHARE_WEB_BASE_URL.replace(/\/$/, "")}/community/post/${post.id}`;

      // Compose sharing message
      const shareMessage = `${post.author}'s post\n\n${contentPreview}\n\nView post: ${postUrl}\n\n#DentiCheck`;

      const result = await Share.share(
        Platform.OS === 'ios'
          ? {
            message: shareMessage,
            url: postUrl,
            title: "Share Post",
          }
          : {
            message: shareMessage,
            title: "Share Post",
          }
      );

      if (result.action === Share.sharedAction) {
        // Share successful
      } else if (result.action === Share.dismissedAction) {
        // Share cancelled
      }
    } catch (error) {
      Alert.alert("Share Failed", "An error occurred while sharing the post.");
    }
  };

  const MAX_PREVIEW_LINES = 10;

  const PostCard = ({
    post,
    onDelete,
    onEdit,
    isExpanded,
    onToggleExpand,
  }: {
    post: Post;
    onDelete: (postId: string) => void;
    onEdit?: (post: Post) => void;
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
      <View
        className="p-5 mb-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm"
        style={{
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }}
      >
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
              View more...
            </Text>
          )}
          {isLong && isExpanded && (
            <Text className="text-slate-500 dark:text-slate-400 text-[14px] p-1 mt-1 font-bold">
              Hide
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
          <View className="mb-4">
            {post.tags.map((tag, idx) => (
              <View
                key={idx}
                className={`flex-row items-center px-2 py-1.5 rounded-md mb-1 ${tag.type === "product" ? "bg-indigo-50" : "bg-blue-50"
                  }`}
              >
                {tag.type === "product" ? (
                  <Package size={12} color="#4f46e5" />
                ) : (
                  <LucideHospital size={12} color="#2563eb" />
                )}
                <Text
                  className={`ml-1 text-xs font-bold ${tag.type === "product" ? "text-indigo-600" : "text-blue-600"
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
              <>
                {onEdit && (
                  <TouchableOpacity onPress={() => onEdit(post)}>
                    <Pencil size={20} color="#94a3b8" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onDelete(post.id)} disabled={deleteLoading}>
                  <Trash2 size={20} color="#94a3b8" />
                </TouchableOpacity>
              </>
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
    <View className="flex-1 bg-background dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        <CommunityHeader
          isSpecialView={isSpecialView}
          isMyPostsView={isMyPostsView}
          isLikedView={isLikedView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          onOpenCreate={() => setShowCreateDialog(true)}
        />

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={theme?.primary ?? "#3b82f6"} />
            <Text className="mt-3 text-slate-500">Loading posts...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <Text className="text-center text-red-500">
              Failed to load posts.
            </Text>
            <Text className="mt-2 text-center text-slate-500 text-sm">
              {error.message}
            </Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <MessageCircle size={48} color="#cbd5e1" />
            <Text className="mt-4 text-center text-slate-600 font-medium">
              {isMyPostsView ? "No posts created yet" : isLikedView ? "No liked posts" : "No posts yet"}
            </Text>
            <Text className="mt-2 text-center text-slate-400 text-sm">
              {isMyPostsView ? "Start a conversation in the community." : isLikedView ? "Like posts you are interested in." : "Be the first to post."}
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
                onEdit={post.isMine ? (p) => setEditingPost(p) : undefined}
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
          visible={showCreateDialog || !!editingPost}
          onClose={() => {
            setShowCreateDialog(false);
            setEditingPost(null);
          }}
          onSubmit={(data) => {
            if (editingPost) {
              handleUpdatePostForm(editingPost.id, data);
              return;
            }
            handleSubmitPostForm(data);
          }}
          submitLoading={(editingPost ? updateLoading : createLoading)}
          title={editingPost ? "Edit Post" : "Write Post"}
          initialValues={editingPost ? postToInitialValues(editingPost) : null}
        />
      </SafeAreaView>
    </View>
  );
}
