import React from "react";
import { FlatList, ListRenderItem, View, ActivityIndicator, Text } from "react-native";

export type InfiniteScrollViewProps<T> = {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  contentContainerStyle?: object;
  loadingColor?: string;
  className?: string;
  /** ref 전달 시 scrollToIndex 등 FlatList 메서드 사용 가능 */
  listRef?: React.RefObject<FlatList<T> | null>;
  /** 이 값이 바뀌면 행을 다시 그림 (예: 답글 펼침 상태). data 외 상태로 렌더가 바뀔 때 필수 */
  extraData?: unknown;
};

export function InfiniteScrollView<T>({
  data,
  renderItem,
  keyExtractor,
  hasMore,
  loadingMore,
  onLoadMore,
  onEndReachedThreshold = 0.3,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  loadingColor = "#0ea5e9",
  className,
  listRef,
  extraData,
}: InfiniteScrollViewProps<T>) {
  const handleEndReached = () => {
    if (hasMore && !loadingMore) onLoadMore();
  };

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={loadingColor} />
        <Text className="text-slate-400 text-xs mt-2">불러오는 중...</Text>
      </View>
    );
  };

  return (
    <FlatList<T>
      ref={listRef}
      className={className}
      data={data}
      extraData={extraData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
    />
  );
}
