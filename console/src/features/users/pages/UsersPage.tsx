/**
 * Frontend File: Users Management Page
 * Path: console/src/features/users/pages/UsersPage.tsx
 * Description: [관리자 기능] 회원 관리 페이지
 * - 회원 목록 조회, 검색, 상태(ACTIVE/SUSPENDED) 표시
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { graphqlRequest, ADMIN_MANAGEMENT_QUERIES } from "@/shared/lib/api";
import { SearchFilterBar } from "@/shared/components/SearchFilterBar";
import { ConfirmModal } from "@/shared/components/ConfirmModal";
import { useAlert } from "@/shared/context/AlertContext";

interface User {
    id: string;
    displayId: number;
    nickname: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
}

const UPDATE_USER_STATUS_MUTATION = `
    mutation UpdateUserStatus($userId: ID!, $status: String!) {
        updateUserStatus(userId: $userId, status: $status) {
            id
            status
        }
    }
`;

export function UsersPage() {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [filter, setFilter] = useState("all");
    const [statusConfirm, setStatusConfirm] = useState<{
        isOpen: boolean;
        userId: string;
        newStatus: string;
    }>({
        isOpen: false,
        userId: "",
        newStatus: "",
    });

    const fetchUsers = () => {
        setLoading(true);
        graphqlRequest(ADMIN_MANAGEMENT_QUERIES.GET_USERS, { keyword })
            .then((data) => {
                setUsers(data.adminUsers || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers();
    };

    const handleUpdateStatusClick = (userId: string, newStatus: string) => {
        setStatusConfirm({
            isOpen: true,
            userId,
            newStatus,
        });
    };

    const handleConfirmUpdate = async () => {
        const { userId, newStatus } = statusConfirm;

        try {
            await graphqlRequest(UPDATE_USER_STATUS_MUTATION, { userId, status: newStatus });
            showAlert("Status has been changed.", { title: "Success" });
            fetchUsers();
        } catch (error) {
            console.error(error);
            showAlert("Failed to change status.", { title: "Error" });
        } finally {
            setStatusConfirm((prev) => ({ ...prev, isOpen: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("menu_users")}</h2>
                    <p className="text-slate-500">{t("desc_users")}</p>
                </div>
                <SearchFilterBar
                    keyword={keyword}
                    setKeyword={setKeyword}
                    filter={filter}
                    setFilter={setFilter}
                    onSearch={handleSearch}
                    options={[
                        { value: "all", label: t("filter_all") },
                        { value: "email", label: t("filter_email") },
                        { value: "nickname", label: t("filter_nickname") },
                    ]}
                />
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium w-20 text-center">NO</th>
                                <th className="px-6 py-3 font-medium w-40 text-center">{t("th_nickname")}</th>
                                <th className="px-6 py-3 font-medium text-left">{t("th_email")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_role")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_status")}</th>
                                <th className="px-6 py-3 font-medium w-40 text-center">{t("th_created_at")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        {t("no_users")}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 text-center">
                                            {user.displayId}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium text-center">
                                            {user.nickname}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-left">{user.email}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    user.role === "ADMIN"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {t(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    user.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700"
                                                        : user.status === "SUSPENDED"
                                                          ? "bg-red-100 text-red-700"
                                                          : "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {t(user.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-center">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                onClick={() =>
                                                    handleUpdateStatusClick(
                                                        user.id,
                                                        user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                                                    )
                                                }
                                            >
                                                {user.status === "ACTIVE" ? t("SUSPENDED") : t("ACTIVE")}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={statusConfirm.isOpen}
                onClose={() => setStatusConfirm((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmUpdate}
                title="Confirm"
                message={`Are you sure you want to change the status of '${users.find((u) => u.id === statusConfirm.userId)?.nickname || ""}' to ${statusConfirm.newStatus === "ACTIVE" ? "Activate" : "Suspend"}?`}
                isDestructive={statusConfirm.newStatus === "SUSPENDED"}
                confirmLabel={statusConfirm.newStatus === "ACTIVE" ? "Activate" : "Suspend"}
            />
        </div>
    );
}
