import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, ImagePlus, X, Heart, Package, Hospital as LucideHospital, MessageCirclePlus } from 'lucide-react-native';
import { useColorTheme } from '../../shared/providers/ColorThemeProvider';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { GET_POST, GET_COMMENTS, GET_REPLIES, CREATE_COMMENT, CREATE_REPLY, DELETE_COMMENT, UPDATE_COMMENT, TOGGLE_COMMENT_LIKE } from '../../graphql/queries';
import { useInfiniteScroll } from '../../shared/hooks/useInfiniteScroll';
import { InfiniteScrollView } from '../../shared/components/InfiniteScrollView';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { CommentPostCard, type CommentPostCardPost } from './CommentPostCard';
import { type CommentItemData } from './CommentListSection';
import { CommentInputBar } from './CommentInputBar';
import { BASE_URL } from '../../shared/lib/constants';
import { type Tag } from '../../shared/components/TagPickerModal';
import { CommentFormModal } from './CommentFormModal';

function resolveImageUrl(url: string): string {
  if (!url?.trim()) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      const base = new URL(BASE_URL);
      return base.origin + u.pathname + (u.search || '');
    }
  } catch (_) { }
  return url;
}

/** Convert ISO-8601 string to relative time string */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function CommentListScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CommentList'>>();
  const { theme } = useColorTheme();
  const postId = route.params?.postId;

  const { data: postData, loading: postLoading, error: postError } = useQuery<{ post: CommentPostCardPost | null }>(GET_POST, {
    variables: { id: postId ?? '' },
    skip: !postId,
  });

  type RawCommentItem = {
    id: string;
    author: string;
    content: string;
    images: string[];
    tags?: { type: string; name: string; id?: string }[];
    createdAt: string | null;
    likes: number;
    isLiked: boolean;
    isMine: boolean;
    replyCount?: number;
  };

  const {
    items: rawCommentItems,
    loading: commentsLoading,
    loadingMore: commentsLoadingMore,
    hasMore: commentsHasMore,
    loadMore: loadMoreComments,
    refetch: refetchComments,
  } = useInfiniteScroll<{ comments: RawCommentItem[] }, RawCommentItem>({
    query: GET_COMMENTS,
    pageSize: 10,
    parseItems: (data) => data.comments,
    baseVariables: { postId: postId ?? '' },
    getItemId: (item) => item.id,
    resetKey: postId,
  });

  const [createComment, { loading: createCommentLoading }] = useMutation<{
    createComment: { id: string; author: string; content: string; images: string[]; tags?: { type: string; name: string }[]; createdAt: string | null; likes: number; isLiked: boolean; isMine: boolean };
  }>(CREATE_COMMENT, {
    refetchQueries: postId ? [{ query: GET_POST, variables: { id: postId } }] : [],
  });

  const post = postData?.post ?? null;
  const serverComments: CommentItemData[] = useMemo(() => {
    const mapped = rawCommentItems.map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      images: c.images ?? [],
      tags: c.tags ?? [],
      createdAt: formatRelativeTime(c.createdAt),
      likes: c.likes ?? 0,
      isLiked: c.isLiked ?? false,
      isMine: c.isMine ?? false,
      replyCount: c.replyCount ?? 0,
    }));
    console.log('[Comment Query] Frontend - Mapped comments count:', mapped.length);
    mapped.forEach(c => {
      console.log('[Comment Query] Frontend - Comment ID:', c.id, 'tags count:', c.tags?.length ?? 0, 'tags:', c.tags);
    });
    return mapped;
  }, [rawCommentItems]);

  const [deleteComment] = useMutation<{ deleteComment: boolean }>(DELETE_COMMENT, {
    refetchQueries: postId ? [{ query: GET_POST, variables: { id: postId } }] : [],
    onCompleted: () => refetchComments(),
  });

  const [updateComment, { loading: updateCommentLoading }] = useMutation<{
    updateComment: { id: string; author: string; content: string; images: string[]; tags?: { type: string; name: string }[]; createdAt: string | null; likes: number; isLiked: boolean; isMine: boolean };
  }>(UPDATE_COMMENT, {
    onCompleted: () => refetchComments(),
  });

  const [createReply, { loading: createReplyLoading }] = useMutation<{
    createReply: { id: string; author: string; content: string; images: string[]; tags?: { type: string; name: string }[]; createdAt: string | null; likes: number; isLiked: boolean; isMine: boolean; replyCount: number };
  }>(CREATE_REPLY, {
    refetchQueries: postId ? [{ query: GET_POST, variables: { id: postId } }] : [],
    onCompleted: () => refetchComments(),
  });

  const [toggleCommentLike] = useMutation<{ toggleCommentLike: { id: string; likes: number; isLiked: boolean } }>(TOGGLE_COMMENT_LIKE, {
    onCompleted: () => refetchComments(),
  });

  const [comment, setComment] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  /** Edit modal: id of the comment/reply being edited */
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  /** Edit modal: parent comment id for reply editing (null for comment editing) */
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  /** Reply modal: id of the parent comment to reply to */
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  /** List of expanded reply parent ids (toggled on tap) */
  const [expandedReplyParentIds, setExpandedReplyParentIds] = useState<string[]>([]);
  /** Parent comment id → Reply list cache */
  const [repliesMap, setRepliesMap] = useState<Record<string, CommentItemData[]>>({});
  const [fetchReplies, { loading: repliesLoading }] = useLazyQuery<{ replies: RawCommentItem[] }>(GET_REPLIES, {
    fetchPolicy: 'network-only',
  });
  const [loadingRepliesParentId, setLoadingRepliesParentId] = useState<string | null>(null);

  const applyRepliesToMap = (parentId: string, replies: RawCommentItem[]) => {
    const seen = new Set<string>();
    const unique = replies.filter((c: RawCommentItem) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    const mapped: CommentItemData[] = unique.map((c: RawCommentItem) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      images: c.images ?? [],
      tags: c.tags ?? [],
      createdAt: formatRelativeTime(c.createdAt),
      likes: c.likes ?? 0,
      isLiked: c.isLiked ?? false,
      isMine: c.isMine ?? false,
      replyCount: 0,
    }));
    setRepliesMap((prev) => ({ ...prev, [parentId]: mapped }));
  };

  const toggleReplies = (parentId: string) => {
    const isExpanded = expandedReplyParentIds.includes(parentId);
    if (isExpanded) {
      setExpandedReplyParentIds((prev) => prev.filter((id) => id !== parentId));
    } else {
      setExpandedReplyParentIds((prev) => [...prev, parentId]);
      setLoadingRepliesParentId(parentId);
      fetchReplies({ variables: { parentCommentId: parentId } }).then((result) => {
        setLoadingRepliesParentId(null);
        if (result.data?.replies && Array.isArray(result.data.replies)) {
          applyRepliesToMap(parentId, result.data.replies);
        } else {
          setRepliesMap((prev) => ({ ...prev, [parentId]: [] }));
        }
      });
    }
  };

  const uploadCommunityImage = async (localUri: string): Promise<string> => {
    const token = await SecureStore.getItemAsync('accessToken');
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    const res = await fetch(`${BASE_URL}/api/community/upload-image`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Upload failed (${res.status})`);
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  const pickCommentImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Notice', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const comments = serverComments;

  const handleSend = async () => {
    const content = comment.trim();
    if (!content || !postId) return;
    const imageUriToSend = selectedImageUri;
    const tagsToSend = selectedTags;

    try {
      let imageUrl: string | null = null;
      if (imageUriToSend) {
        imageUrl = await uploadCommunityImage(imageUriToSend);
      }
      const dentalIds = tagsToSend
        .filter((t): t is Tag & { id: string } => t.type === 'hospital' && !!t.id)
        .map((t) => t.id);
      const productIds = tagsToSend
        .filter((t): t is Tag & { id: string } => t.type === 'product' && !!t.id)
        .map((t) => t.id);

      const result = await createComment({
        variables: {
          input: {
            postId,
            content,
            imageUrl,
            dentalIds: dentalIds.length > 0 ? dentalIds : null,
            productIds: productIds.length > 0 ? productIds : null,
          },
        },
      });

      console.log('[Comment Creation] Frontend - Response received:', result.data?.createComment);
      console.log('[Comment Creation] Frontend - Response tags:', result.data?.createComment?.tags);

      // Clear input and tags on success
      setComment('');
      setSelectedImageUri(null);
      setSelectedTags([]);

      // Refresh comment list
      await refetchComments();
    } catch (e) {
      // Do not restore input on failure (so user can try again)
      const msg = e instanceof Error ? e.message : 'Failed to post comment.';
      Alert.alert('Error', msg);
    }
  };

  const toggleLike = async (id: string) => {
    try {
      await toggleCommentLike({ variables: { commentId: id } });
    } catch (_e) {
      // Maintain original state with refetch on failure
    }
  };

  /** Edit comment or reply (pass parentId only for replies) */
  const handleEditComment = (commentId: string, parentId?: string) => {
    setEditingCommentId(commentId);
    setEditingParentId(parentId ?? null);
  };

  const pickImageForModal = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Notice', 'Gallery permission is required.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    return result.canceled || !result.assets[0] ? null : result.assets[0].uri;
  };

  const closeFormModal = () => {
    setEditingCommentId(null);
    setEditingParentId(null);
    setReplyingToCommentId(null);
  };

  const isFormModalOpen = editingCommentId != null || replyingToCommentId != null;
  const formModalMode = editingCommentId != null ? 'edit' : 'reply';
  const editItem =
    editingCommentId != null
      ? editingParentId != null
        ? repliesMap[editingParentId]?.find((r) => r.id === editingCommentId) ?? null
        : serverComments.find((c) => c.id === editingCommentId) ?? null
      : null;
  const initialContent = formModalMode === 'edit' && editItem ? editItem.content : '';
  const initialImageUrl = formModalMode === 'edit' && editItem ? (editItem.images?.[0] ?? null) : null;
  const initialTags: Tag[] =
    formModalMode === 'edit' && editItem
      ? (editItem.tags ?? []).map((tag) => ({
        type: tag.type as 'hospital' | 'product',
        name: tag.name,
        id: (tag as { id?: string }).id ?? undefined,
      }))
      : [];

  const handleFormModalSave = async (payload: { content: string; imageUrl: string; dentalIds: string[]; productIds: string[] }) => {
    if (editingCommentId) {
      const parentId = editingParentId;
      await updateComment({
        variables: {
          input: {
            id: editingCommentId,
            content: payload.content,
            imageUrl: payload.imageUrl,
            dentalIds: payload.dentalIds,
            productIds: payload.productIds,
          },
        },
      });
      await refetchComments();
      if (parentId) {
        setRepliesMap((prev) => {
          const next = { ...prev };
          delete next[parentId];
          return next;
        });
        setExpandedReplyParentIds((prev) => prev.filter((id) => id !== parentId));
      }
      setEditingCommentId(null);
      setEditingParentId(null);
    } else if (replyingToCommentId) {
      const parentId = replyingToCommentId;
      await createReply({
        variables: {
          input: {
            parentCommentId: parentId,
            content: payload.content,
            imageUrl: payload.imageUrl || undefined,
            dentalIds: payload.dentalIds.length > 0 ? payload.dentalIds : undefined,
            productIds: payload.productIds.length > 0 ? payload.productIds : undefined,
          },
        },
      });
      await refetchComments();
      setRepliesMap((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });
      setExpandedReplyParentIds((prev) => prev.filter((id) => id !== parentId));
      setReplyingToCommentId(null);
    }
  };

  /** Delete comment or reply (when parentId is passed for a reply, remove from UI immediately then refetch search list) */
  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    try {
      await deleteComment({ variables: { id: commentId } });
      if (parentId) {
        setRepliesMap((prev) => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).filter((r) => r.id !== commentId),
        }));
        fetchReplies({ variables: { parentCommentId: parentId } }).then((result) => {
          if (result.data?.replies && Array.isArray(result.data.replies)) {
            applyRepliesToMap(parentId, result.data.replies);
          } else {
            setRepliesMap((prev) => ({ ...prev, [parentId]: [] }));
          }
        });
      }
    } catch (_e) {
      // Delete failure can be handled (e.g. toast)
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-slate-900">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 py-3 flex-row items-center border-b border-border dark:border-slate-800 bg-background dark:bg-slate-900">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-1">
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800 dark:text-white">Comments</Text>
        </View>

        {postId && postLoading && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={theme?.primary ?? '#3b82f6'} />
            <Text className="mt-2 text-slate-500">Loading post...</Text>
          </View>
        )}

        {postId && postError && (
          <View className="py-8 px-4">
            <Text className="text-center text-red-500">Failed to load post.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 py-2">
              <Text className="text-center text-blue-600 font-medium">Return to list</Text>
            </TouchableOpacity>
          </View>
        )}

        {postId && post === null && !postLoading && !postError && (
          <View className="py-8 px-4">
            <Text className="text-center text-slate-500">This post has been deleted or does not exist.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 py-2">
              <Text className="text-center text-blue-600 font-medium">Return to list</Text>
            </TouchableOpacity>
          </View>
        )}

        {(!postId || post) && (
          <InfiniteScrollView<CommentItemData>
            data={serverComments}
            keyExtractor={(item) => item.id}
            hasMore={commentsHasMore}
            loadingMore={commentsLoadingMore}
            onLoadMore={loadMoreComments}
            extraData={{ repliesMap, expandedReplyParentIds, loadingRepliesParentId }}
            contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 24 }}
            ListHeaderComponent={
              <>
                {post ? <CommentPostCard post={post} /> : null}
                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 mt-4">Comments</Text>
                {postId && commentsLoading ? (
                  <View className="py-8 items-center">
                    <ActivityIndicator size="small" color={theme?.primary ?? '#3b82f6'} />
                    <Text className="mt-2 text-sm text-slate-500">Loading comments...</Text>
                  </View>
                ) : null}
              </>
            }
            ListEmptyComponent={
              postId && !commentsLoading ? (
                <Text className="text-sm text-slate-400 dark:text-slate-500 py-4">No comments yet.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="flex-row gap-3 mb-6">
                <View className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center overflow-hidden">
                  <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.author[0]}</Text>
                </View>
                <View className="flex-1 pr-2">
                  <View className="flex-row items-baseline mb-1">
                    <Text className="font-bold text-sm text-slate-900 dark:text-white mr-2">{item.author}</Text>
                    <Text className="text-xs text-slate-400">{item.createdAt}</Text>
                  </View>
                  <Text className="text-slate-800 dark:text-slate-200 text-sm leading-5 mb-2">{item.content}</Text>
                  {item.tags && item.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-2">
                      {item.tags.map((tag, idx) => (
                        <View
                          key={idx}
                          className={`flex-row items-center px-2 py-1 rounded-md ${tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                            }`}
                        >
                          {tag.type === 'product' ? (
                            <Package size={12} color="#4f46e5" />
                          ) : (
                            <LucideHospital size={12} color="#2563eb" />
                          )}
                          <Text
                            className={`ml-1 text-xs font-bold ${tag.type === 'product' ? 'text-indigo-600' : 'text-blue-600'
                              }`}
                          >
                            {tag.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.images?.[0] ? (
                    <Image
                      source={{ uri: resolveImageUrl(item.images[0]) }}
                      className="w-full max-w-[200px] h-40 rounded-lg bg-slate-200 dark:bg-slate-700 mb-2"
                      resizeMode="cover"
                    />
                  ) : null}
                  {/* Reply count: Use length from repliesMap if fetched (synced with server), otherwise use replyCount from comment list */}
                  {(() => {
                    const displayReplyCount = repliesMap[item.id] !== undefined ? repliesMap[item.id].length : (item.replyCount ?? 0);
                    return displayReplyCount > 0 ? (
                      <TouchableOpacity
                        onPress={() => toggleReplies(item.id)}
                        className="mb-1 py-0.5"
                        activeOpacity={0.7}
                      >
                        <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                          {expandedReplyParentIds.includes(item.id) ? 'Hide replies' : `View ${displayReplyCount} replies`}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text className="text-xs text-slate-400 dark:text-slate-500 mb-1">0 replies</Text>
                    );
                  })()}
                  <TouchableOpacity
                    onPress={() => setReplyingToCommentId(item.id)}
                    className="flex-row items-center gap-1.5 py-1"
                    activeOpacity={0.7}
                  >
                    <MessageCirclePlus size={14} color="#22c55e" />
                    <Text className="text-xs font-medium text-green-500">Reply</Text>
                  </TouchableOpacity>
                  {/* Expanded reply list */}
                  {expandedReplyParentIds.includes(item.id) && (
                    <View className="mt-2 ml-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      {repliesMap[item.id] === undefined && loadingRepliesParentId === item.id ? (
                        <ActivityIndicator size="small" color={theme?.primary ?? '#3b82f6'} style={{ marginVertical: 8 }} />
                      ) : Array.isArray(repliesMap[item.id]) && repliesMap[item.id].length > 0 ? (
                        repliesMap[item.id].map((reply) => (
                          <View key={reply.id} className="flex-row gap-2 mb-4">
                            <View className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center overflow-hidden">
                              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{reply.author[0]}</Text>
                            </View>
                            <View className="flex-1">
                              <View className="flex-row items-baseline mb-0.5">
                                <Text className="font-bold text-xs text-slate-900 dark:text-white mr-2">{reply.author}</Text>
                                <Text className="text-[10px] text-slate-400">{reply.createdAt}</Text>
                              </View>
                              <Text className="text-slate-800 dark:text-slate-200 text-xs leading-4">{reply.content}</Text>
                              {reply.tags && reply.tags.length > 0 && (
                                <View className="flex-row flex-wrap gap-1.5 mt-1">
                                  {reply.tags.map((tag, idx) => (
                                    <View
                                      key={idx}
                                      className={`flex-row items-center px-1.5 py-0.5 rounded ${tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                                        }`}
                                    >
                                      {tag.type === 'product' ? (
                                        <Package size={10} color="#4f46e5" />
                                      ) : (
                                        <LucideHospital size={10} color="#2563eb" />
                                      )}
                                      <Text className={`ml-0.5 text-[10px] font-bold ${tag.type === 'product' ? 'text-indigo-600' : 'text-blue-600'}`}>
                                        {tag.name}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              {reply.images?.[0] ? (
                                <Image
                                  source={{ uri: resolveImageUrl(reply.images[0]) }}
                                  className="mt-1 w-full max-w-[160px] h-32 rounded-lg bg-slate-200 dark:bg-slate-700"
                                  resizeMode="cover"
                                />
                              ) : null}
                            </View>
                            <View className="flex-row items-center gap-1 self-start">
                              {reply.isMine && (
                                <>
                                  <TouchableOpacity onPress={() => handleEditComment(reply.id, item.id)}>
                                    <Text className="text-[10px] font-bold text-slate-400">Edit</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteComment(reply.id, item.id)}>
                                    <Text className="text-[10px] font-bold text-red-500">Delete</Text>
                                  </TouchableOpacity>
                                </>
                              )}
                              <TouchableOpacity onPress={() => toggleLike(reply.id)} className="flex-row items-center gap-0.5">
                                <Heart
                                  size={12}
                                  color={reply.isLiked ? '#ef4444' : '#94a3b8'}
                                  fill={reply.isLiked ? '#ef4444' : 'transparent'}
                                />
                                {reply.likes > 0 && <Text className="text-[10px] text-slate-400">{reply.likes}</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : repliesMap[item.id] && repliesMap[item.id].length === 0 ? (
                        <Text className="text-xs text-slate-400 py-2">No replies yet.</Text>
                      ) : null}
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2 self-start">
                  {item.isMine && (
                    <>
                      <TouchableOpacity onPress={() => handleEditComment(item.id)}>
                        <Text className="text-xs font-bold text-slate-400">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                        <Text className="text-xs font-bold text-red-500">Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={() => toggleLike(item.id)} className="flex-row items-center gap-1">
                    <Heart
                      size={14}
                      color={item.isLiked ? '#ef4444' : '#94a3b8'}
                      fill={item.isLiked ? '#ef4444' : 'transparent'}
                    />
                    {item.likes > 0 && (
                      <Text className="text-[10px] text-slate-400">{item.likes}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            loadingColor={theme?.primary ?? '#3b82f6'}
          />
        )}

        {(!postId || post) && (
          <CommentInputBar
            value={comment}
            onChangeText={setComment}
            onSend={handleSend}
            sending={createCommentLoading}
            imageUri={selectedImageUri}
            onAddImage={pickCommentImage}
            onRemoveImage={() => setSelectedImageUri(null)}
            selectedTags={selectedTags}
            onSelectTag={(tag) => {
              if (!selectedTags.find((t) => t.type === tag.type && (tag.id ? t.id === tag.id : t.name === tag.name))) {
                setSelectedTags([...selectedTags, tag]);
              }
            }}
            onRemoveTag={(index) => {
              setSelectedTags(selectedTags.filter((_, i) => i !== index));
            }}
          />
        )}

        {/* Shared modal for comment edit / reply creation */}
        <CommentFormModal
          key={editingCommentId ?? replyingToCommentId ?? editingParentId ?? 'closed'}
          visible={isFormModalOpen}
          onClose={closeFormModal}
          mode={formModalMode}
          title={formModalMode === 'edit' ? 'Edit Comment' : 'Reply'}
          initialContent={initialContent}
          initialImageUrl={initialImageUrl}
          initialTags={initialTags}
          onSave={handleFormModalSave}
          saving={formModalMode === 'edit' ? updateCommentLoading : createReplyLoading}
          onPickImage={pickImageForModal}
          uploadImage={uploadCommunityImage}
        />
      </SafeAreaView>
    </View>
  );
}
