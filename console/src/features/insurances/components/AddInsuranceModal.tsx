/**
 * Frontend Component: AddInsuranceModal
 * Path: console/src/features/insurances/components/AddInsuranceModal.tsx
 * Description: [관리자 기능] 제휴 보험 상품 추가 모달
 */
import React, { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { graphqlRequest } from "@/shared/lib/api";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { useAlert } from "@/shared/context/AlertContext";

interface AddInsuranceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CREATE_INSURANCE_MUTATION = `
    mutation CreateInsurance($input: InsuranceInput!) {
        createInsurance(input: $input) {
            id
            name
        }
    }
`;

const CATEGORY_MAP: Record<string, string> = {
    치아보험: "cat_insurance_dental",
    종합보험: "cat_insurance_total",
    실비보험: "cat_insurance_actual",
    어린이보험: "cat_insurance_child",
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export function AddInsuranceModal({ isOpen, onClose, onSuccess }: AddInsuranceModalProps) {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [formData, setFormData] = useState({
        category: CATEGORIES[0],
        name: "",
        price: 0,
        company: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await graphqlRequest(CREATE_INSURANCE_MUTATION, { input: formData });
            onSuccess();
            onClose();
            setFormData({ category: CATEGORIES[0], name: "", price: 0, company: "" });
        } catch (error) {
            console.error(error);
            showAlert("Failed to save.", { title: "Error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("modal_add_insurance")}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_category")}</label>
                    <select
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {t(CATEGORY_MAP[cat])}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_insurance_name")}</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_price")}</label>
                    <input
                        type="number"
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_company")}</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        {t("btn_cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? t("btn_saving") : t("btn_save")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
