/**
 * Frontend Component: AddProductModal
 * Path: console/src/features/products/components/AddProductModal.tsx
 * Description: [관리자 기능] 제휴 상품 추가 모달
 */
import React, { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { graphqlRequest } from "@/shared/lib/api";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { useAlert } from "@/shared/context/AlertContext";

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CREATE_PRODUCT_MUTATION = `
    mutation CreateProduct($input: ProductInput!) {
        createProduct(input: $input) {
            id
            name
            imageUrl
        }
    }
`;

const CATEGORY_MAP: Record<string, string> = {
    칫솔류: "cat_toothbrush",
    "치약 및 세정제": "cat_paste",
    "치간, 혀 및 구강": "cat_interdental",
    특수케어: "cat_special",
    기타: "cat_etc",
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [formData, setFormData] = useState({
        category: CATEGORIES[0],
        name: "",
        price: 0,
        manufacturer: "",
        imageUrl: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await graphqlRequest(CREATE_PRODUCT_MUTATION, { input: formData });
            onSuccess();
            onClose();
            setFormData({ category: CATEGORIES[0], name: "", price: 0, manufacturer: "", imageUrl: "" });
        } catch (error) {
            console.error(error);
            showAlert("Failed to save.", { title: "Error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("modal_add_product")}>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_product_name")}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_manufacturer")}</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_image_url")}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t("placeholder_image_url")}
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => showAlert("File upload will be available soon.", { title: "Notice" })}
                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-sm whitespace-nowrap"
                        >
                            {t("btn_file_attach")}
                        </button>
                    </div>
                    {formData.imageUrl && (
                        <div className="mt-2 relative w-full h-32 rounded-md overflow-hidden border border-slate-200">
                            <img
                                src={formData.imageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                        </div>
                    )}
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
