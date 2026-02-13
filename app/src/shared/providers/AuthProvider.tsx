import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import axios from "axios";

const API_SERVER_URL = process.env.EXPO_PUBLIC_API_SERVER_URL;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
// iOS까지 Dev Build로 네이티브 Sign-In 할 거면 보통 iosClientId도 필요할 수 있어(선택)
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (!API_SERVER_URL) throw new Error("EXPO_PUBLIC_API_SERVER_URL is missing");
if (!GOOGLE_WEB_CLIENT_ID)
  throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing");

// Expo Go 여부 (deprecated appOwnership 대신)
const isExpoGo = Constants.executionEnvironment === "storeClient";

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: "google" | "dev";
}

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInDev: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const googleConfiguredRef = useRef(false);

  const saveSession = async (
    accessToken: string,
    refreshToken?: string,
    u?: AuthUser,
  ) => {
    setToken(accessToken);
    await SecureStore.setItemAsync("accessToken", accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync("refreshToken", refreshToken);
    }
    if (u) {
      setUser(u); // State update
      await SecureStore.setItemAsync("user", JSON.stringify(u));
    }
    // u가 없으면 기존 User 유지 (토큰만 갱신하는 경우를 위해 삭제 로직 제거)
  };

  const clearSession = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("user");
  };

  const loadStorage = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("accessToken");
      const storedUser = await SecureStore.getItemAsync("user");

      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error("Failed to load auth auth storage:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const exchangeIdTokenToJwt = async (idToken: string, user: AuthUser) => {
    // api 서버에서 idToken 검증 후 JWT(access/refresh) 발급
    const jwtRes = await axios.post(`${API_SERVER_URL}/auth/mobile/google`, {
      idToken,
    });

    const { accessToken, refreshToken, user: serverUser } = jwtRes.data ?? {};

    if (!accessToken) throw new Error("Server did not return accessToken");

    // 서버가 user를 같이 주면 그걸 쓰고, 아니면 최소 provider만 저장
    const mergedUser: AuthUser = serverUser
      ? {
          email: serverUser.email,
          name: serverUser.nickname,
          picture: serverUser.profileImage,
          provider: "google",
        }
      : { ...user, provider: "google" };

    await saveSession(accessToken, refreshToken, mergedUser);
  };

  const signInWithGoogle = async () => {
    if (isLoading) return; // ✅ 연타 방지 + 로딩 시작
    setIsLoading(true);
    setError(null);

    try {
      // Dev Build에서만 동작하도록 동적 import
      const mod = await import("@react-native-google-signin/google-signin");
      const { GoogleSignin, statusCodes } = mod;

      if (!googleConfiguredRef.current) {
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: false,
        });
        googleConfiguredRef.current = true;
      }

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const userInfo = await GoogleSignin.signIn();
      const user: AuthUser = {
        email: userInfo.data?.user.email,
        name: userInfo.data?.user.name,
        picture: userInfo.data?.user.photo,
      };

      // ✅ 이걸로 idToken 다시 요청 가능(가끔 signIn 결과에 없을 때가 있음)
      const tokens = await GoogleSignin.getTokens().catch(() => null);

      const idToken =
        userInfo?.idToken ||
        (tokens as any)?.idToken || // 버전에 따라 형태가 다를 수 있음
        null;

      if (!idToken)
        throw new Error("No idToken. Check webClientId / console settings.");

      await exchangeIdTokenToJwt(idToken, user);
    } catch (e: any) {
      try {
        const mod = await import("@react-native-google-signin/google-signin");
        const { statusCodes } = mod;

        if (e?.code === statusCodes.IN_PROGRESS) return; // ✅ 진행 중이면 무시
        if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      } catch {}

      setError(e?.message ?? String(e));
      console.log("Google Sign-In failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signInDev = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const mockUser: AuthUser = {
        email: "dev@denticheck.com",
        name: "Dev User",
        picture: "https://via.placeholder.com/150",
        provider: "dev",
      };
      const mockAccessToken = "dev-access-token";
      const mockRefreshToken = "dev-refresh-token";

      await saveSession(mockAccessToken, mockRefreshToken, mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");

      // 1. 서버 로그아웃 호출 (DB 토큰 무효화)
      if (refreshToken) {
        try {
          // Spring Security LogoutHandler는 기본적으로 /logout POST 요청을 처리함
          await axios.post(`${API_SERVER_URL}/logout`, { refreshToken });
        } catch (serverError) {
          console.log(
            "Server logout failed, but proceeding with local logout",
            serverError,
          );
        }
      }

      // 2. 구글 모듈 로그아웃 (Dev Build 전용)
      if (!isExpoGo) {
        try {
          const mod = await import("@react-native-google-signin/google-signin");
          await mod.GoogleSignin.signOut();
        } catch {
          // 구글 모듈 로그아웃 실패는 무시
        }
      }

      // 3. 로컬 세션 클리어
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Refresh 요청에는 Authorization 헤더를 붙이지 않음 (JWTFilter에서 만료된 토큰 거부 방지)
        if (token && !config.url?.includes("/jwt/refresh")) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 재시도한 요청이 아닐 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (!refreshToken) {
              // 리프레시 토큰 없으면 로그아웃
              await clearSession();
              return Promise.reject(error);
            }

            // 토큰 갱신 요청
            // 주의: requestInterceptor에서 Authorization 헤더 제외됨
            const { data } = await axios.post(`${API_SERVER_URL}/jwt/refresh`, {
              refreshToken,
            });

            const {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            } = data;

            if (newAccessToken) {
              // 새 토큰 저장. API가 user를 안 주면 기존 user 상태를 유지하기 위해 인자로 넘김
              // saveSession 로직이 (u) ? set : delete 이므로,
              // 갱신 시에는 반드시 user 객체를 넘겨야 함.
              await saveSession(
                newAccessToken,
                newRefreshToken,
                user || undefined,
              );

              // 실패했던 요청에 새 토큰 적용 후 재시도
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.log("Token refresh failed:", refreshError);
            await clearSession();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      error,
      signInWithGoogle,
      signInDev,
      signOut,
      fetchWithAuth,
    }),
    [user, token, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
