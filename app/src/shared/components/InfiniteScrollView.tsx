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
  /** FlatList methods like scrollToIndex can be used when ref is passed */
  listRef?: React.RefObject<FlatList<T> | null>;
  /** Redraw rows if this value changes (e.g. reply expand state). Required when rendering changes by status other than data. */
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
        <Text className="text-slate-400 text-xs mt-2">Loading...</Text>
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
      removeClippedSubviews={false}
    />
  );
}
