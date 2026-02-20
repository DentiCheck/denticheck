import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AlertModal } from "@/shared/components/AlertModal";

interface AlertOptions {
    title?: string;
    buttonLabel?: string;
    onOk?: () => void;
}

interface AlertContextType {
    showAlert: (message: string, options?: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [title, setTitle] = useState("Notice");
    const [buttonLabel, setButtonLabel] = useState("OK");
    const [onOk, setOnOk] = useState<(() => void) | undefined>(undefined);

    const showAlert = useCallback((msg: string, options?: AlertOptions) => {
        setMessage(msg);
        setTitle(options?.title || "Notice");
        setButtonLabel(options?.buttonLabel || "OK");
        setOnOk(() => options?.onOk);
        setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        if (onOk) {
            onOk();
        }
    }, [onOk]);

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <AlertModal
                isOpen={isOpen}
                onClose={handleClose}
                title={title}
                message={message}
                buttonLabel={buttonLabel}
            />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error("useAlert must be used within an AlertProvider");
    }
    return context;
}
