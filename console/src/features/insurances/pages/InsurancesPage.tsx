/**
 * Frontend File: Insurance Products Page
 * Path: console/src/features/insurances/pages/InsurancesPage.tsx
 * Description: [관리자 기능] 제휴 보험 관리 페이지
 * - 보험 상품 목록 조회, 추가(모달), 검색 기능
 */
import { useState, useEffect } from "react";
import { AddInsuranceModal } from "@/features/insurances/components/AddInsuranceModal";
import { EditInsuranceModal } from "@/features/insurances/components/EditInsuranceModal";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { graphqlRequest } from "@/shared/lib/api";
import { SearchFilterBar } from "@/shared/components/SearchFilterBar";
import { useAlert } from "@/shared/context/AlertContext";
import { ConfirmModal } from "@/shared/components/ConfirmModal";

const GET_INSURANCES = `
    query AdminInsuranceProducts($category: String, $keyword: String) {
        adminInsuranceProducts(category: $category, keyword: $keyword) {
            id
            displayId
            category
            name
            price
            company
            isPartner
        }
    }
`;

const DELETE_INSURANCE_MUTATION = `
    mutation DeleteInsurance($id: ID!) {
        deleteInsurance(id: $id)
    }
`;

export function InsurancesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [insurances, setInsurances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [filter, setFilter] = useState("all");
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
        isOpen: false,
        id: "",
        name: "",
    });

    const fetchInsurances = (silent = false) => {
        if (!silent) setLoading(true);
        const params: any = {};
        if (filter === "category") {
            params.category = keyword;
        } else {
            params.keyword = keyword;
        }

        graphqlRequest(GET_INSURANCES, params)
            .then((data) => {
                setInsurances(data.adminInsuranceProducts || []);
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
            await graphqlRequest(DELETE_INSURANCE_MUTATION, { id });
            showAlert("Deleted successfully.", { title: "Success" });
            fetchInsurances();
        } catch (error) {
            console.error(error);
            showAlert("Failed to delete.", { title: "Error" });
        } finally {
            setDeleteConfirm({ isOpen: false, id: "", name: "" });
        }
    };

    useEffect(() => {
        fetchInsurances();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchInsurances();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("menu_insurances")}</h2>
                    <p className="text-slate-500">{t("desc_insurances")}</p>
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
                            { value: "치아보험", label: t("cat_insurance_dental") },
                            { value: "종합보험", label: t("cat_insurance_total") },
                            { value: "실비보험", label: t("cat_insurance_actual") },
                            { value: "어린이보험", label: t("cat_insurance_child") },
                        ]}
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                        {t("btn_add_insurance")}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium w-20 text-center">NO</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_category")}</th>
                                <th className="px-6 py-3 font-medium text-left">{t("th_product_name")}</th>
                                <th className="px-6 py-3 font-medium w-40 text-center">{t("th_company")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_price")}</th>
                                <th className="px-6 py-3 font-medium w-32 text-center">{t("th_partner")}</th>
                                <th className="px-6 py-3 font-medium w-48 text-center">{t("th_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : insurances.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        {t("no_insurances")}
                                    </td>
                                </tr>
                            ) : (
                                insurances.map((insurance) => (
                                    <tr key={insurance.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 text-center">
                                            {insurance.displayId}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-center">{insurance.category}</td>
                                        <td className="px-6 py-4 text-slate-900 font-medium text-left">
                                            {insurance.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-center">{insurance.company}</td>
                                        <td className="px-6 py-4 text-slate-600 text-center">
                                            ₩{insurance.price.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${insurance.isPartner
                                                    ? "bg-blue-50 text-blue-600 border-blue-200"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                                    }`}
                                            >
                                                {insurance.isPartner ? t("status_partnered") : t("status_unpartnered")}
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
                                                                mutation UpdateInsurancePartnerStatus($id: ID!, $isPartner: Boolean!) {
                                                                    updateInsurancePartnerStatus(id: $id, isPartner: $isPartner) { id isPartner }
                                                                }
                                                            `,
                                                                { id: insurance.id, isPartner: !insurance.isPartner },
                                                            );
                                                            fetchInsurances(true);
                                                        } catch (error) {
                                                            console.error(error);
                                                            showAlert("Failed to change status.", { title: "Error" });
                                                        }
                                                    }}
                                                >
                                                    {insurance.isPartner ? t("btn_partner_off") : t("btn_partner_on")}
                                                </button>
                                                <button
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                    onClick={() => {
                                                        setSelectedInsurance(insurance);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    {t("btn_edit")}
                                                </button>
                                                <button
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                    onClick={() => handleDeleteClick(insurance.id, insurance.name)}
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

            <AddInsuranceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchInsurances(true);
                    showAlert("Insurance product added successfully.", { title: "Success" });
                }}
            />

            <EditInsuranceModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedInsurance(null);
                }}
                onSuccess={() => {
                    fetchInsurances(true);
                }}
                insurance={selectedInsurance}
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
