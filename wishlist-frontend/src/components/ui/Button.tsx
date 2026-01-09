"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", size = "md", fullWidth = false, ...props }, ref) => {

        const baseClass = "btn";
        const variantClass = variant === "primary" ? "btn-primary" : variant === "outline" ? "btn-outline" : "btn-ghost";
        const widthClass = fullWidth ? "w-full" : "";

        // Simple size handling via inline styles or additional classes could happen here
        // For now relying on global .btn padding, but can add specifics if needed.
        const sizeStyles: Record<string, React.CSSProperties> = {
            sm: { padding: "0.4rem 0.75rem", fontSize: "0.85rem" },
            md: { padding: "0.6rem 1.2rem", fontSize: "0.925rem" },
            lg: { padding: "0.8rem 1.6rem", fontSize: "1rem" },
        };

        return (
            <button
                ref={ref}
                className={`${baseClass} ${variantClass} ${widthClass} ${className}`}
                style={{ ...sizeStyles[size], ...props.style }}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";
