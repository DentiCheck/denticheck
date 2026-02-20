import { useState, useEffect, useRef } from "react";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { DocumentNode } from "graphql";

const DEFAULT_PAGE_SIZE = 10;

export type UseInfiniteScrollOptions<TData, TItem> = {
  query: DocumentNode;
  pageSize?: number;
  /** Extract list from response (e.g. (data) => data.posts) */
  parseItems: (data: TData) => TItem[];
  /** Additional variables for query besides limit/offset (Optional) */
  baseVariables?: Record<string, unknown>;
  /** Item unique key. If provided, excludes items with the same key when appending to prevent duplicate key errors. */
  getItemId?: (item: TItem) => string;
  /** If this value changes, the list is reset and the first page is queried again (e.g. filter tab selectedTab) */
  resetKey?: unknown;
};

export type UseInfiniteScrollResult<TItem> = {
  items: TItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  error: Error | undefined;
};

/**
 * Infinite scroll hook based on limit/offset.
 * Query must accept $limit, $offset variables.
 */
export function useInfiniteScroll<TData, TItem>({
  query,
  pageSize = DEFAULT_PAGE_SIZE,
  parseItems,
  baseVariables = {},
  getItemId,
  resetKey,
}: UseInfiniteScrollOptions<TData, TItem>): UseInfiniteScrollResult<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const isFirstMount = useRef(true);
  const parseItemsRef = useRef(parseItems);
  parseItemsRef.current = parseItems;

  const { data, loading, error, refetch: refetchQuery } = useQuery<TData>(query, {
    variables: { ...baseVariables, limit: pageSize, offset: 0 },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network", // Draw immediately with cache, update with latest data in background
  });

  // Reset list if filter (tab) changes. Automatically requeried due to useQuery variable change.
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setItems([]);
    setHasMore(true);
  }, [resetKey]);

  const [fetchMore, { loading: loadingMore }] = useLazyQuery<TData>(query, {
    fetchPolicy: "network-only",
  });

  // Sync items only when data changes (initial load + refetch completed). parseItems is referenced via ref to prevent unnecessary re-execution.
  useEffect(() => {
    if (!data) return;
    const list = parseItemsRef.current(data);
    setItems(list);
    if (list.length < pageSize) setHasMore(false);
  }, [data, pageSize]);

  const loadMore = () => {
    if (loadingMore || !hasMore || items.length === 0) return;
    const offset = items.length;
    fetchMore({
      variables: { ...baseVariables, limit: pageSize, offset },
    }).then((result) => {
      const payload = result.data;
      if (payload == null) return;
      const next = parseItems(payload as TData);
      setItems((prev) => {
        if (getItemId) {
          const existingIds = new Set(prev.map(getItemId));
          const newItems = next.filter((item) => !existingIds.has(getItemId(item)));
          return [...prev, ...newItems];
        }
        return [...prev, ...next];
      });
      if (next.length < pageSize) setHasMore(false);
    });
  };

  const refetch = () => {
    setHasMore(true);
    refetchQuery({ fetchPolicy: "network-only" });
    // List is not cleared. Updated in the useEffect above when new data arrives (prevents flickering)
  };

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
    error,
  };
}
