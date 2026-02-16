import { Navigate, Outlet } from "react-router-dom";

/**
 * [관리자 기능] 인증 여부를 확인하여 보호된 라우트에 접근을 제어하는 컴포넌트
 */
export function ProtectedRoute() {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
        // 토큰이 없으면 로그인 페이지로 리다이렉트
        return <Navigate to="/login" replace />;
    }

    // 토큰이 있으면 자식 라우트(Outlet) 또는 children 렌더링
    return <Outlet />;
}
