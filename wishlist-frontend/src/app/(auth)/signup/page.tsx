"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Backend currently takes email/password, sending name for future proofing or if schema allows
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
                <Input
                    type="email"
                    placeholder="name@example.com"
                    label="Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                    type="password"
                    placeholder="••••••••"
                    label="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p style={{ color: "#e34d4d", fontSize: "0.9rem" }}>{error}</p>}

                <Button size="lg" fullWidth style={{ marginTop: "0.5rem" }} disabled={loading}>
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
