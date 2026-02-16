import { useNavigate } from "react-router-dom";
import { useAlert } from "@/shared/context/AlertContext";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function LoginPage() {
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // 소셜 로그인 이벤트
    const handleSocialLogin = (provider: string) => {
        window.location.href = `${BACKEND_API_BASE_URL}/oauth2/authorization/${provider}`;
    };

    // 개발용 로그인 이벤트
    const handleDevLogin = () => {
        const devToken = "admin-test-token-2026";
        localStorage.setItem("accessToken", devToken);
        // refreshToken은 Dev Login에서 처리하지 않음 (필요시 더미 값 설정)
        localStorage.setItem("refreshToken", "dev-refresh-token");

        showAlert("개발자 계정으로 로그인되었습니다.", { title: "로그인 성공" });
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">DentiCheck Console</h1>
                    <p className="text-slate-500">관리자 로그인을 진행해주세요.</p>
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
                        Google 계정으로 계속하기
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleDevLogin}
                        className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium shadow-sm"
                    >
                        Dev Login (개발용)
                    </button>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">&copy; 2026 DentiCheck. All rights reserved.</p>
            </div>
        </div>
    );
}
