"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check local storage on mount
        const stored = localStorage.getItem("token");
        if (stored) {
            setToken(stored);
        }
    }, []);

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
