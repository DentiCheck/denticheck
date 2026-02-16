import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AlertProvider } from "@/shared/context/AlertContext";

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    return (
        <BrowserRouter>
            <AlertProvider>
                {/* Add other providers here (Theme, QueryClient, Auth, etc.) */}
                {children}
            </AlertProvider>
        </BrowserRouter>
    );
}
