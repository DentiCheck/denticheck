import React, { useState, useEffect } from "react";
import { Modal } from "@/shared/components/Modal";
import { graphqlRequest } from "@/shared/lib/api";
import { useLanguage } from "@/features/dashboard/context/LanguageContext";
import { useAlert } from "@/shared/context/AlertContext";
import DaumPostcode from "react-daum-postcode";

interface EditDentistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dentist: {
        id: string;
        name: string;
        address: string;
        phone: string;
        description?: string;
        homepageUrl?: string;
    } | null;
}

const UPDATE_DENTIST_MUTATION = `
    mutation UpdateDental($id: ID!, $input: DentalInput!) {
        updateDental(id: $id, input: $input) {
            id
            name
        }
    }
`;

export function EditDentistModal({ isOpen, onClose, onSuccess, dentist }: EditDentistModalProps) {
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
    const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);

    useEffect(() => {
        if (dentist) {
            setFormData({
                name: dentist.name || "",
                address: dentist.address || "",
                phone: dentist.phone || "",
                description: dentist.description || "",
                homepageUrl: dentist.homepageUrl || "",
            });
        }
    }, [dentist]);

    const handleComplete = (data: any) => {
        let fullAddress = data.address;
        let extraAddress = "";

        if (data.addressType === "R") {
            if (data.bname !== "") {
                extraAddress += data.bname;
            }
            if (data.buildingName !== "") {
                extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
        }

        setFormData({ ...formData, address: fullAddress });
        setIsAddressSearchOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dentist) return;

        setLoading(true);
        try {
            await graphqlRequest(UPDATE_DENTIST_MUTATION, {
                id: dentist.id,
                input: formData,
            });
            showAlert("Saved successfully.", { title: "Success" });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.message || t("msg_save_fail");
            showAlert(errorMessage, { title: "Error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t("modal_edit_dentist")}>
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
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setIsAddressSearchOpen(true)}
                                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap"
                            >
                                주소 검색
                            </button>
                        </div>
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_description")}</label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("label_homepage")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.homepageUrl}
                            onChange={(e) => setFormData({ ...formData, homepageUrl: e.target.value })}
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

            {/* Address Search Modal */}
            {isAddressSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg">주소 검색</h3>
                            <button
                                onClick={() => setIsAddressSearchOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="h-[500px]">
                            <DaumPostcode onComplete={handleComplete} style={{ height: '100%' }} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
