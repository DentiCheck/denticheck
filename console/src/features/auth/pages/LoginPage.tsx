import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useAlert } from "@/shared/context/AlertContext";
import { useAuth } from "@/features/auth/context/AuthContext";
import { setMemoryToken } from "@/shared/lib/authApi";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { Globe } from "lucide-react";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showAlert } = useAlert();
    const { lang, toggleLang, t } = useLanguage();
    const { saveToken } = useAuth();

    // 에러 파라미터 처리 (관리자 권한 없음 등)
    useEffect(() => {
        const error = searchParams.get("error");
        if (error === "forbidden") {
            showAlert("Access denied. Please log in with an admin account.", { title: "Access Denied" });
            // 파라미터 제거 (URL 깔끔하게 유지)
            navigate("/login", { replace: true });
        }
    }, [searchParams, showAlert, navigate, t]);

    // 소셜 로그인 이벤트
    const handleSocialLogin = (provider: string) => {
        window.location.href = `${BACKEND_API_BASE_URL}/oauth2/authorization/${provider}`;
    };

    // 개발용 로그인 이벤트
    const handleDevLogin = async () => {
        try {
            const res = await fetch(`${BACKEND_API_BASE_URL}/jwt/dev-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // 쿠키 수신 필수
            });

            if (!res.ok) throw new Error("Dev Login Failed");

            const data = await res.json();

            // 메모리에 저장 (Context + API Utility)
            saveToken(data.accessToken);
            setMemoryToken(data.accessToken);

            showAlert("Logged in with developer account.", { title: "Login Success" });
            navigate("/dashboard");
        } catch (error) {
            console.error(error);
            showAlert("Developer login failed.", { title: "Login Failed" });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative">
            {/* Language Toggle Button */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={toggleLang}
                    className="flex items-center justify-center gap-2 w-24 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <Globe className="w-3 h-3" />
                    <span>{lang === "ko" ? t("lang_ko") : t("lang_en")}</span>
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("login_title")}</h1>
                    <p className="text-slate-500">{t("login_desc")}</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleSocialLogin("google")}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 bg-white shadow-sm"
                    >
                        <img
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google"
                            className="w-5 h-5"
                        />
                        {t("login_google")}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">{t("login_or_continue")}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleDevLogin}
                        className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium shadow-sm"
                    >
                        {t("login_dev_admin")}
                    </button>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">&copy; 2026 DentiCheck. All rights reserved.</p>
            </div>
        </div>
    );
}
