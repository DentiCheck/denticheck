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
// For iOS Dev Build native sign-in, iosClientId may also be needed (optional)
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (!API_SERVER_URL) throw new Error("EXPO_PUBLIC_API_SERVER_URL is missing");
if (!GOOGLE_WEB_CLIENT_ID)
  throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing");

// Check for Expo Go (instead of deprecated appOwnership)
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
  signInDev: (role?: "user" | "admin") => Promise<void>;
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
    // Keep existing User if u is missing (remove deletion logic to allow token-only refresh)
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

      // Backward compatibility for old dev token format
      const normalizedToken =
        storedToken === "dev-access-token"
          ? "devAccessToken-user"
          : storedToken === "dev-access-token-admin"
            ? "devAccessToken-admin"
            : storedToken === "dev-access-token-user"
              ? "devAccessToken-user"
              : storedToken;

      if (normalizedToken && normalizedToken !== storedToken) {
        await SecureStore.setItemAsync("accessToken", normalizedToken);
      }

      if (normalizedToken) setToken(normalizedToken);
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
    // Verify idToken on API server and issue JWT (access/refresh)
    const jwtRes = await axios.post(`${API_SERVER_URL}/auth/mobile/google`, {
      idToken,
    });

    const { accessToken, refreshToken, user: serverUser } = jwtRes.data ?? {};

    if (!accessToken) throw new Error("Server did not return accessToken");

    // If the server provides user info, use it; otherwise, store at least the provider
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
    if (isLoading) return; // ✅ Prevent multiple clicks + start loading
    setIsLoading(true);
    setError(null);

    try {
      // Dynamic import to work only in Dev Build
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
        name: userInfo.data?.user.name ?? undefined,
        picture: userInfo.data?.user.photo ?? undefined,
      };

      const tokens = await GoogleSignin.getTokens().catch(() => null);

      const signInIdToken =
        userInfo.type === "success" ? userInfo.data.idToken : null;
      const idToken = signInIdToken ?? tokens?.idToken ?? null;

      if (!idToken)
        throw new Error("No idToken. Check webClientId / console settings.");

      await exchangeIdTokenToJwt(idToken, user);
    } catch (e: any) {
      try {
        const mod = await import("@react-native-google-signin/google-signin");
        const { statusCodes } = mod;

        if (e?.code === statusCodes.IN_PROGRESS) return; // ✅ Ignore if in progress
        if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      } catch { }

      // [NEW] Server custom error handling (1100 ~ 1103)
      if (e?.response?.data?.code) {
        const errorCode = e.response.data.code;
        const errorMessage = e.response.data.message;

        // Error code range related to user status (refer to UserErrorCode)
        if (errorCode >= 1100 && errorCode <= 1199) {
          Alert.alert("Login Failed", errorMessage);
          setIsLoading(false);
          return;
        }
      }

      setError(e?.message ?? String(e));
      console.log("Google Sign-In failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signInDev = async (role: "user" | "admin" = "user") => {
    setError(null);
    setIsLoading(true);
    try {
      const mockUser: AuthUser = {
        email: "dev@denticheck.com",
        name: role === "admin" ? "Dev Admin" : "Dev User",
        picture: "https://via.placeholder.com/150",
        provider: "dev",
      };
      // JWTFilter checks for devAccessToken-user / devAccessToken-admin
      const mockAccessToken =
        role === "admin" ? "devAccessToken-admin" : "devAccessToken-user";
      const mockRefreshToken = "dev-refresh-token"; // Refresh token isn't strictly validated (just handled as expired if not in DB)

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

      // 1. Call server logout (invalidate DB token)
      if (refreshToken) {
        try {
          await axios.post(`${API_SERVER_URL}/jwt/logout`, { refreshToken }, { timeout: 3000 });
        } catch (serverError) {
          console.log("Server logout failed, but proceeding with local logout", serverError);
        }
      }

      // 2. Google module logout (Dev Build exclusive)
      if (!isExpoGo) {
        try {
          const mod = await import("@react-native-google-signin/google-signin");
          await mod.GoogleSignin.signOut();
        } catch { }
      }

      // 3. Clear local session
      await clearSession();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      console.error("Logout failed:", e);
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
        // Do not attach Authorization header to Refresh requests (prevent rejection of expired tokens in JWTFilter)
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

        // If it's a 401 error and not a retried request
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (!refreshToken) {
              // Logout if no refresh token
              await clearSession();
              return Promise.reject(error);
            }

            // Token refresh request
            const { data } = await axios.post(`${API_SERVER_URL}/jwt/refresh`, {
              refreshToken,
            });

            // Check for accessToken, refreshToken or newAccessToken, newRefreshToken based on backend spec
            const newAccessToken = data.newAccessToken || data.accessToken;
            const newRefreshToken = data.newRefreshToken || data.refreshToken;

            if (newAccessToken) {
              // Save new tokens. Pass existing user state to maintain it if the API doesn't provide user info.
              // Since the saveSession logic is (u) ? set : delete,
              // the user object must be passed when refreshing.
              await saveSession(
                newAccessToken,
                newRefreshToken,
                user || undefined,
              );

              // Retry the failed request after applying the new token
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
