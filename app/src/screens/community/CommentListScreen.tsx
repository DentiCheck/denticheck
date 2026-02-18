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
  } catch (_) {}
  return url;
}

/** ISO-8601 문자열을 상대 시간 문자열로 변환 */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
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
    console.log('[댓글 조회] 프론트엔드 - 매핑된 댓글 개수:', mapped.length);
    mapped.forEach(c => {
      console.log('[댓글 조회] 프론트엔드 - 댓글 ID:', c.id, 'tags 개수:', c.tags?.length ?? 0, 'tags:', c.tags);
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
  /** 수정 모달: 수정 중인 댓글/답글 id */
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  /** 수정 모달: 답글 수정 시 부모 댓글 id (댓글 수정이면 null) */
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  /** 답글 모달: 답글 달 댓글(부모) id */
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  /** 답글 펼친 댓글 id 목록 (탭 시 토글) */
  const [expandedReplyParentIds, setExpandedReplyParentIds] = useState<string[]>([]);
  /** 부모 댓글 id → 답글 목록 캐시 */
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
      throw new Error(body || `업로드 실패 (${res.status})`);
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  const pickCommentImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림', '갤러리 접근 권한이 필요해요.');
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
      
      console.log('[댓글 작성] 프론트엔드 - dentalIds:', dentalIds);
      console.log('[댓글 작성] 프론트엔드 - tagsToSend:', tagsToSend);
      
      const result = await createComment({
        variables: {
          input: { postId, content, imageUrl, dentalIds: dentalIds.length > 0 ? dentalIds : null },
        },
      });
      
      console.log('[댓글 작성] 프론트엔드 - 응답 받음:', result.data?.createComment);
      console.log('[댓글 작성] 프론트엔드 - 응답 tags:', result.data?.createComment?.tags);
      
      // 성공 시 입력창과 태그 비우기
      setComment('');
      setSelectedImageUri(null);
      setSelectedTags([]);
      
      // 댓글 목록 새로고침
      await refetchComments();
    } catch (e) {
      // 실패 시 입력 복원하지 않음 (사용자가 다시 입력할 수 있도록)
      const msg = e instanceof Error ? e.message : '댓글 등록에 실패했어요.';
      Alert.alert('오류', msg);
    }
  };

  const toggleLike = async (id: string) => {
    try {
      await toggleCommentLike({ variables: { commentId: id } });
    } catch (_e) {
      // 실패 시 refetch로 원래 상태 유지
    }
  };

  /** 댓글 또는 답글 수정 (답글일 때만 parentId 전달) */
  const handleEditComment = (commentId: string, parentId?: string) => {
    setEditingCommentId(commentId);
    setEditingParentId(parentId ?? null);
  };

  const pickImageForModal = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림', '갤러리 접근 권한이 필요해요.');
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

  const handleFormModalSave = async (payload: { content: string; imageUrl: string; dentalIds: string[] }) => {
    if (editingCommentId) {
      const parentId = editingParentId;
      await updateComment({
        variables: {
          input: {
            id: editingCommentId,
            content: payload.content,
            imageUrl: payload.imageUrl,
            dentalIds: payload.dentalIds,
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

  /** 댓글 또는 답글 삭제 (답글일 때 parentId 전달 시 즉시 UI에서 제거 후 서버에서 목록 재조회) */
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
      // 삭제 실패 시 토스트 등 처리 가능
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* 헤더 */}
        <View className="px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-slate-800">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-1">
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800 dark:text-white">댓글</Text>
        </View>

        {postId && postLoading && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={theme?.primary ?? '#3b82f6'} />
            <Text className="mt-2 text-slate-500">게시글 불러오는 중...</Text>
          </View>
        )}

        {postId && postError && (
          <View className="py-8 px-4">
            <Text className="text-center text-red-500">게시글을 불러오지 못했어요.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 py-2">
              <Text className="text-center text-blue-600 font-medium">목록으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}

        {postId && post === null && !postLoading && !postError && (
          <View className="py-8 px-4">
            <Text className="text-center text-slate-500">삭제되었거나 존재하지 않는 게시글이에요.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 py-2">
              <Text className="text-center text-blue-600 font-medium">목록으로 돌아가기</Text>
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
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListHeaderComponent={
              <>
                {post ? <CommentPostCard post={post} /> : null}
                <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 mt-4">댓글</Text>
                {postId && commentsLoading ? (
                  <View className="py-8 items-center">
                    <ActivityIndicator size="small" color={theme?.primary ?? '#3b82f6'} />
                    <Text className="mt-2 text-sm text-slate-500">댓글 불러오는 중...</Text>
                  </View>
                ) : null}
              </>
            }
            ListEmptyComponent={
              postId && !commentsLoading ? (
                <Text className="text-sm text-slate-400 dark:text-slate-500 py-4">아직 댓글이 없습니다.</Text>
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
                          className={`flex-row items-center px-2 py-1 rounded-md ${
                            tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                          }`}
                        >
                          {tag.type === 'product' ? (
                            <Package size={12} color="#4f46e5" />
                          ) : (
                            <LucideHospital size={12} color="#2563eb" />
                          )}
                          <Text
                            className={`ml-1 text-xs font-bold ${
                              tag.type === 'product' ? 'text-indigo-600' : 'text-blue-600'
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
                  {/* 답글 개수: 한 번이라도 불러온 적 있으면 repliesMap 길이 사용(서버와 동기화), 없으면 댓글 목록의 replyCount */}
                  {(() => {
                    const displayReplyCount = repliesMap[item.id] !== undefined ? repliesMap[item.id].length : (item.replyCount ?? 0);
                    return displayReplyCount > 0 ? (
                      <TouchableOpacity
                        onPress={() => toggleReplies(item.id)}
                        className="mb-1 py-0.5"
                        activeOpacity={0.7}
                      >
                        <Text className="text-xs font-medium text-green-600 dark:text-green-400">
                          {expandedReplyParentIds.includes(item.id) ? '답글 접기' : `${displayReplyCount}개의 답글 보기`}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text className="text-xs text-slate-400 dark:text-slate-500 mb-1">0개의 답글</Text>
                    );
                  })()}
                  <TouchableOpacity
                    onPress={() => setReplyingToCommentId(item.id)}
                    className="flex-row items-center gap-1.5 py-1"
                    activeOpacity={0.7}
                  >
                    <MessageCirclePlus size={14} color="#22c55e" />
                    <Text className="text-xs font-medium text-green-500">답글 달기</Text>
                  </TouchableOpacity>
                  {/* 펼친 답글 목록 */}
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
                                      className={`flex-row items-center px-1.5 py-0.5 rounded ${
                                        tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
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
                                    <Text className="text-[10px] font-bold text-slate-400">수정</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteComment(reply.id, item.id)}>
                                    <Text className="text-[10px] font-bold text-red-500">삭제</Text>
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
                        <Text className="text-xs text-slate-400 py-2">답글이 없습니다.</Text>
                      ) : null}
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2 self-start">
                  {item.isMine && (
                    <>
                      <TouchableOpacity onPress={() => handleEditComment(item.id)}>
                        <Text className="text-xs font-bold text-slate-400">수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                        <Text className="text-xs font-bold text-red-500">삭제</Text>
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

        {/* 댓글 수정 / 답글 달기 공용 모달 */}
        <CommentFormModal
          key={editingCommentId ?? replyingToCommentId ?? editingParentId ?? 'closed'}
          visible={isFormModalOpen}
          onClose={closeFormModal}
          mode={formModalMode}
          title={formModalMode === 'edit' ? '댓글 수정' : '답글 달기'}
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
