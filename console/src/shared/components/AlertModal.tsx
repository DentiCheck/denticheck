import React from "react";
import { Modal } from "./Modal";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    buttonLabel?: string;
}

export function AlertModal({ isOpen, onClose, title, message, buttonLabel = "확인" }: AlertModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-slate-600">{message}</p>
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                    >
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
