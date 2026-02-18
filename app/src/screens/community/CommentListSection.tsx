import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Heart, Hospital as LucideHospital, Package } from 'lucide-react-native';
import { BASE_URL } from '../../shared/lib/constants';

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

export type CommentItemData = {
  id: string;
  author: string;
  content: string;
  /** 이미지 URL 목록 (최대 1장) */
  images?: string[];
  /** 태그 목록 */
  tags?: { type: string; name: string }[];
  createdAt: string;
  likes: number;
  isLiked: boolean;
  isMine?: boolean;
  /** 답글 개수 (최상위 댓글만) */
  replyCount?: number;
};

type CommentListSectionProps = {
  comments: CommentItemData[];
  onLike: (id: string) => void;
  onReply?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function CommentListSection({ comments, onLike, onReply, onEdit, onDelete }: CommentListSectionProps) {
  console.log('[CommentListSection] 렌더링 - 댓글 개수:', comments.length);
  comments.forEach(item => {
    console.log('[CommentListSection] 댓글 ID:', item.id, 'tags:', item.tags, 'tags 개수:', item.tags?.length ?? 0);
  });
  
  return (
    <View>
      <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">
        댓글
      </Text>
      {comments.length === 0 ? (
        <Text className="text-sm text-slate-400 dark:text-slate-500 py-4">
          아직 댓글이 없습니다.
        </Text>
      ) : (
        comments.map((item) => {
          console.log('[CommentListSection] 렌더링 중 - 댓글 ID:', item.id, 'tags:', item.tags);
          return (
        <View key={item.id} className="flex-row gap-3 mb-6">
          <View className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center overflow-hidden">
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {item.author[0]}
            </Text>
          </View>
          <View className="flex-1 pr-2">
            <View className="flex-row items-baseline mb-1">
              <Text className="font-bold text-sm text-slate-900 dark:text-white mr-2">
                {item.author}
              </Text>
              <Text className="text-xs text-slate-400">{item.createdAt}</Text>
            </View>
            <Text className="text-slate-800 dark:text-slate-200 text-sm leading-5 mb-2">
              {item.content}
            </Text>
            {(() => {
              console.log('[CommentListSection] 태그 렌더링 체크 - 댓글 ID:', item.id, 'tags 존재:', !!item.tags, 'tags 길이:', item.tags?.length ?? 0);
              return null;
            })()}
            {item.tags && item.tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-2">
                {item.tags.map((tag, idx) => {
                  console.log('[CommentListSection] 태그 렌더링 - 댓글 ID:', item.id, '태그:', tag);
                  return (
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
                  );
                })}
              </View>
            )}
            {item.images?.[0] ? (
              <Image
                source={{ uri: resolveImageUrl(item.images[0]) }}
                className="w-full max-w-[200px] h-40 rounded-lg bg-slate-200 dark:bg-slate-700 mb-2"
                resizeMode="cover"
              />
            ) : null}
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => onReply?.(item.id)}>
                <Text className="text-xs font-bold text-slate-400">답글 달기</Text>
              </TouchableOpacity>
              {item.isMine && (
                <>
                  <TouchableOpacity onPress={() => onEdit?.(item.id)}>
                    <Text className="text-xs font-bold text-slate-400">수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete?.(item.id)}>
                    <Text className="text-xs font-bold text-red-500">삭제</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <View className="items-center gap-3 pt-1">
            <TouchableOpacity onPress={() => onLike(item.id)} className="items-center">
              <Heart
                size={14}
                color={item.isLiked ? '#ef4444' : '#94a3b8'}
                fill={item.isLiked ? '#ef4444' : 'transparent'}
              />
              {item.likes > 0 && (
                <Text className="text-[10px] text-slate-400 mt-0.5">{item.likes}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
          );
        })
      )}
    </View>
  );
}
