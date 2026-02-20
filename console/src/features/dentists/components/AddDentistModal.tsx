import React, { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { graphqlRequest } from "@/shared/lib/api";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { useAlert } from "@/shared/context/AlertContext";

interface AddDentistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CREATE_DENTIST_MUTATION = `
    mutation CreateDental($input: DentalInput!) {
        createDental(input: $input) {
            id
            name
        }
    }
`;

export function AddDentistModal({ isOpen, onClose, onSuccess }: AddDentistModalProps) {
    const { t } = useLanguage();
    const { showAlert } = useAlert();
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        description: "",
        homepageUrl: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await graphqlRequest(CREATE_DENTIST_MUTATION, { input: formData });
            onSuccess();
            onClose();
            setFormData({ name: "", address: "", phone: "", description: "", homepageUrl: "" }); // Reset
        } catch (error) {
            console.error(error);
            showAlert("Failed to save.", { title: "Error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("modal_add_dentist")}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_hospital_name")}</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_address")}</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_phone")}</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
