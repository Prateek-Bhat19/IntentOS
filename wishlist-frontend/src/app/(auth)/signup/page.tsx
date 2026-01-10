"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    // Validation Rules
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = password.length >= 8;
    const isFormValid = isEmailValid && isPasswordValid && name.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data } = await api.post("/auth/signup", { email, password });
            login(data.token);
        } catch (err: any) {
            setError(err.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Create an account
                </h1>
                <p style={{ color: "var(--muted-foreground)" }}>
                    Start curating your wishlist today.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <Input
                    type="text"
                    placeholder="John Doe"
                    label="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <div>
                    <Input
                        type="email"
                        placeholder="name@example.com"
                        label="Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {email && !isEmailValid && (
                        <p style={{ fontSize: "0.8rem", color: "#e34d4d", marginTop: "0.3rem" }}>
                            Please enter a valid email address.
                        </p>
                    )}
                </div>

                <div>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        label="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <p style={{
                        fontSize: "0.8rem",
                        marginTop: "0.3rem",
                        color: isPasswordValid ? "#10b981" : "var(--muted-foreground)",
                        transition: "color 0.2s"
                    }}>
                        • Match at least 8 characters {isPasswordValid && "✅"}
                    </p>
                </div>

                {error && <p style={{ color: "#e34d4d", fontSize: "0.9rem" }}>{error}</p>}

                <Button size="lg" fullWidth style={{ marginTop: "0.5rem" }} disabled={loading || !isFormValid}>
                    {loading ? "Signing Up..." : "Sign Up"}
                </Button>
            </form>

            <p style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "var(--foreground)", textDecoration: "underline" }}>
                    Log in
                </Link>
            </p>
        </>
    );
}
