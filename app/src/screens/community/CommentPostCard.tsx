import React from 'react';
import { View, Text, Image } from 'react-native';
import { Package, Hospital as LucideHospital } from 'lucide-react-native';
import { BASE_URL } from '../../shared/lib/constants';

function getTimeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

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

export type CommentPostCardPost = {
  id: string;
  author: string;
  authorInitial: string;
  content: string;
  images?: string[];
  tags?: { type: string; name: string }[];
  likes: number;
  comments: number;
  createdAt: string;
  postType?: string | null;
};

type CommentPostCardProps = {
  post: CommentPostCardPost;
};

function postTypeLabel(postType: string | null | undefined) {
  if (!postType || postType === 'all') return null;
  if (postType === 'product') return { label: '상품후기', icon: Package, bg: 'bg-indigo-50', text: 'text-indigo-600' };
  if (postType === 'hospital') return { label: '병원후기', icon: LucideHospital, bg: 'bg-blue-50', text: 'text-blue-600' };
  return null;
}

export function CommentPostCard({ post }: CommentPostCardProps) {
  return (
    <View className="mb-6 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center">
          <Text className="font-bold text-slate-600 dark:text-slate-300">
            {post.authorInitial}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-slate-800 dark:text-white text-[15px]">
            {post.author}
          </Text>
          <Text className="text-xs text-slate-400 font-medium">
            {getTimeAgo(post.createdAt)}
          </Text>
        </View>
        {postTypeLabel(post.postType) &&
          (() => {
            const typeInfo = postTypeLabel(post.postType)!;
            const Icon = typeInfo.icon;
            return (
              <View className={`flex-row items-center px-2.5 py-1 rounded-lg ${typeInfo.bg}`}>
                <Icon size={12} color={post.postType === 'product' ? '#4f46e5' : '#2563eb'} />
                <Text className={`ml-1 text-xs font-bold ${typeInfo.text}`}>
                  {typeInfo.label}
                </Text>
              </View>
            );
          })()}
      </View>
      <Text className="text-slate-700 dark:text-slate-200 leading-6 text-[15px] mb-4">
        {post.content}
      </Text>
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
      {post.tags && post.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {post.tags.map((tag, idx) => (
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
      <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <Text className="text-sm text-slate-500">좋아요 {post.likes}</Text>
        <Text className="text-sm text-slate-500">댓글 {post.comments}</Text>
      </View>
    </View>
  );
}
