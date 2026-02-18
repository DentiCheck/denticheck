import { useState, useEffect, useRef } from "react";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { DocumentNode } from "graphql";

const DEFAULT_PAGE_SIZE = 10;

export type UseInfiniteScrollOptions<TData, TItem> = {
  query: DocumentNode;
  pageSize?: number;
  /** 응답에서 리스트 추출 (예: (data) => data.posts) */
  parseItems: (data: TData) => TItem[];
  /** 쿼리 변수에 limit/offset 외 추가 변수 (선택) */
  baseVariables?: Record<string, unknown>;
  /** 아이템 고유 키. 넣으면 이어붙일 때 같은 key 있는 항목은 제외해 중복 key 오류 방지 */
  getItemId?: (item: TItem) => string;
  /** 이 값이 바뀌면 목록 초기화 후 첫 페이지 다시 조회 (예: 필터 탭 selectedTab) */
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
 * limit/offset 기반 무한 스크롤 훅.
 * 쿼리는 $limit, $offset 변수를 받아야 함.
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
    fetchPolicy: "cache-and-network", // 캐시로 즉시 그리기, 백그라운드에서 최신 데이터 갱신
  });

  // 필터(탭)이 바뀌면 목록 초기화. useQuery 변수 변경으로 자동 재조회됨
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

  // data가 바뀔 때만 items 동기화 (초기 로드 + refetch 완료 시). parseItems는 ref로 참조해 불필요한 재실행 방지
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
    // 목록은 비우지 않음. 새 data 도착 시 위 useEffect에서 갱신됨 (깜빡임 방지)
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
