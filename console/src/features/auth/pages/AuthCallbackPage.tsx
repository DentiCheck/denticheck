import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "@/shared/context/AlertContext";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function AuthCallbackPage() {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const isExchanging = useRef(false);

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
                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);

                // 로그인 성공 알림은 너무 빠를 수 있으니 생략하거나 toast 등 사용 가능
                navigate("/dashboard");
            } catch (err) {
                console.error(err);
                showAlert("소셜 로그인에 실패했습니다. 다시 시도해주세요.", { title: "로그인 실패" });
                navigate("/login");
            }
        };

        cookieToBody();
    }, [navigate, showAlert]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-slate-700">로그인 처리 중입니다...</h2>
                <p className="text-slate-500 mt-2">잠시만 기다려주세요.</p>
            </div>
        </div>
    );
}
