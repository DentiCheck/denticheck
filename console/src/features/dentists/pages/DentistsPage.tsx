/**
 * Frontend File: Partner Dentists Page
 * Path: console/src/features/dentists/pages/DentistsPage.tsx
 * Description: [관리자 기능] 제휴 치과 관리 페이지
 * - 치과 목록 조회, 추가(모달), 검색(병원명/주소) 기능
 */
import { useState, useEffect } from "react";
import { AddDentistModal } from "@/features/dentists/components/AddDentistModal";
import { EditDentistModal } from "@/features/dentists/components/EditDentistModal";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { graphqlRequest } from "@/shared/lib/api";
import { SearchFilterBar } from "@/shared/components/SearchFilterBar";
import { useAlert } from "@/shared/context/AlertContext";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

const GET_DENTISTS_QUERY = `
    query AdminDentists($keyword: String, $filter: String) {
        adminDentists(keyword: $keyword, filter: $filter) {
            id
            displayId
            name
            address
            phone
            isPartner
        }
    }
`;

const DELETE_DENTIST_MUTATION = `
    mutation DeleteDental($id: ID!) {
        deleteDental(id: $id)
    }
`;

export function DentistsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDentist, setSelectedDentist] = useState<any>(null);
    const { t } = useLanguage();

    const { showAlert } = useAlert();
    const [dentists, setDentists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [filter, setFilter] = useState("all");
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        id: string;
        name: string;
    }>({
        isOpen: false,
        id: "",
        name: "",
    });

    const fetchDentists = (silent = false) => {
        if (!silent) setLoading(true);
        graphqlRequest(GET_DENTISTS_QUERY, { keyword, filter })
            .then((data) => {
                setDentists(data.adminDentists || []);
            })
            .catch(console.error)
            .finally(() => {
                if (!silent) setLoading(false);
            });
    };

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteConfirm({ isOpen: true, id, name });
    };

    const handleConfirmDelete = async () => {
        const { id } = deleteConfirm;
        try {
            await graphqlRequest(DELETE_DENTIST_MUTATION, { id });
            showAlert("Deleted successfully.", { title: "Success" });
            fetchDentists();
        } catch (error) {
            console.error(error);
            showAlert("Failed to delete.", { title: "Error" });
        } finally {
            setDeleteConfirm({ isOpen: false, id: "", name: "" });
        }
    };

    useEffect(() => {
        fetchDentists();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDentists();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("menu_dentists")}</h2>
                    <p className="text-slate-500">{t("desc_dentists")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <SearchFilterBar
                        keyword={keyword}
                        setKeyword={setKeyword}
                        filter={filter}
                        setFilter={setFilter}
                        onSearch={handleSearch}
                        options={[
                            { value: "all", label: t("filter_all") },
                            { value: "name", label: t("th_hospital_name") },
                            { value: "address", label: t("th_address") },
                        ]}
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                        {t("btn_add_dentist")}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium w-20 text-center">NO</th>
                                <th className="px-6 py-3 font-medium w-1/3 text-left">{t("th_hospital_name")}</th>
                                <th className="px-6 py-3 font-medium text-left">{t("th_address")}</th>
                                <th className="px-6 py-3 font-medium w-40 text-center">{t("th_phone")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_partner")}</th>
                                <th className="px-6 py-3 font-medium w-48 text-center">{t("th_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : dentists.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        {t("no_dentists")}
                                    </td>
                                </tr>
                            ) : (
                                dentists.map((dentist) => (
                                    <tr key={dentist.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 text-center">
                                            {dentist.displayId}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium text-left">
                                            {dentist.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-left">{dentist.address}</td>
                                        <td className="px-6 py-4 text-slate-600 text-center">{dentist.phone}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${dentist.isPartner
                                                    ? "bg-blue-50 text-blue-600 border-blue-200"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                                    }`}
                                            >
                                                {dentist.isPartner ? t("status_partnered") : t("status_unpartnered")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button
                                                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                                                    onClick={async () => {
                                                        try {
                                                            await graphqlRequest(
                                                                `
                                                                mutation UpdateDentalPartnerStatus($id: ID!, $isPartner: Boolean!) {
                                                                    updateDentalPartnerStatus(id: $id, isPartner: $isPartner) { id isPartner }
                                                                }
                                                            `,
                                                                { id: dentist.id, isPartner: !dentist.isPartner },
                                                            );
                                                            fetchDentists(true);
                                                        } catch (error) {
                                                            console.error(error);
                                                            showAlert("Failed to change status.", { title: "Error" });
                                                        }
                                                    }}
                                                >
                                                    {dentist.isPartner ? t("btn_partner_off") : t("btn_partner_on")}
                                                </button>
                                                <button
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                    onClick={() => {
                                                        setSelectedDentist(dentist);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    {t("btn_edit")}
                                                </button>
                                                <button
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                    onClick={() => handleDeleteClick(dentist.id, dentist.name)}
                                                >
                                                    {t("btn_delete")}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddDentistModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchDentists(true);
                    showAlert("Dentist added successfully.", { title: "Success" });
                }}
            />

            <EditDentistModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedDentist(null);
                }}
                onSuccess={() => {
                    fetchDentists(true);
                }}
                dentist={selectedDentist}
            />

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmDelete}
                title="Confirm"
                message={`Are you sure you want to delete '${deleteConfirm.name}'?`}
                isDestructive={true}
                confirmLabel="Delete"
            />
        </div>
    );
}
