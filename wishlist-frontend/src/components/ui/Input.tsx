"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", label, error, ...props }, ref) => {
        return (
            <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
                {label && (
                    <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted-foreground)" }}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={className}
                    style={{
                        padding: "0.6rem 0.8rem",
                        fontSize: "0.95rem",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        background: "none",
                        outline: "none",
                        fontFamily: "inherit",
                        transition: "border-color 0.2s ease",
                        color: "var(--foreground)", // Ensure text is visible
                        backgroundColor: "var(--background)", // Ensure background matches theme
                        ...props.style // Allow overrides
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        props.onBlur?.(e);
                    }}
                    {...props}
                />
                {error && <span style={{ fontSize: "0.8rem", color: "#e34d4d" }}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = "Input";
