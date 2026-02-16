/**
 * Frontend Library: Auth API Utilities
 * Path: console/src/shared/lib/authApi.ts
 * Description: JWT 토큰 관리 및 인증된 요청을 위한 유틸리티
 */

const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

// AccessToken 만료시 Refreshing
export async function refreshAccessToken(): Promise<string> {
    // 로컬 스토리지로 부터 RefreshToken 가져옴
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("RefreshToken이 없습니다.");

    const response = await fetch(`${BACKEND_API_BASE_URL}/jwt/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error("AccessToken 갱신 실패");

    // 성공 새 Token 저장
    const data: TokenResponse = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    return data.accessToken;
}

interface FetchOptions extends RequestInit {
    headers?: HeadersInit;
}

// AccessToken과 함께 fetch
export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
    // 로컬 스토리지로 부터 AccessToken 가져옴
    let accessToken = localStorage.getItem("accessToken");

    // 헤더 초기화
    const headers = new Headers(options.headers);

    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    // 옵션 업데이트
    const newOptions: FetchOptions = {
        ...options,
        headers,
    };

    // 요청 진행
    let response = await fetch(url, newOptions);

    // AccessToken 만료로 401 뜨면, Refresh로 재발급
    if (response.status === 401) {
        try {
            accessToken = await refreshAccessToken();
            headers.set("Authorization", `Bearer ${accessToken}`);

            // 재요청
            const retryOptions: FetchOptions = {
                ...options,
                headers,
            };
            response = await fetch(url, retryOptions);
        } catch (err) {
            // Refreshing이 실패했기 때문에 로컬스토리지 삭제 후, 로그인 페이지로
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            // 현재 페이지가 로그인이 필요한 페이지라면 로그인 페이지로 리디렉션
            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
        }
    }

    // 401 외의 에러는 호출하는 쪽에서 처리하도록 둠 (또는 여기서 공통 에러 처리 가능)
    // 하지만 graphqlRequest 등에서 json 파싱을 위해 response를 그대로 반환하는 것이 좋음

    return response;
}
