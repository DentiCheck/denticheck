import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "@/shared/context/AlertContext";
import { useAuth } from "@/features/auth/context/AuthContext";
import { setMemoryToken } from "@/shared/lib/authApi";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function AuthCallbackPage() {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const isExchanging = useRef(false);
    const { saveToken } = useAuth();

    // 페이지 접근시 (백엔드에서 리디렉션으로 여기로 보내면, 실행)
    useEffect(() => {
        if (isExchanging.current) return;
        isExchanging.current = true;

        const cookieToBody = async () => {
            // 요청
            try {
                const exchangeUrl = `${BACKEND_API_BASE_URL}/jwt/exchange`;

                // 쿠키는 credentials: "include" 옵션으로 인해 자동으로 전송됨
                const res = await fetch(exchangeUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error(`인증 실패: ${res.status}`);
                }

                const data = await res.json();

                // 메모리에 저장 (Context + API Utility)
                saveToken(data.accessToken);
                setMemoryToken(data.accessToken);

                // 로그인 성공 알림은 너무 빠를 수 있으니 생략하거나 toast 등 사용 가능
                navigate("/dashboard");
            } catch (err) {
                console.error(err);
                showAlert("Social login failed. Please try again.", { title: "Login Failed" });
                navigate("/login");
            }
        };

        cookieToBody();
    }, [navigate, showAlert, saveToken]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-slate-700">Signing you in...</h2>
                <p className="text-slate-500 mt-2">Please wait a moment.</p>
            </div>
        </div>
    );
}
