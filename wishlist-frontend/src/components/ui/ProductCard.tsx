/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";

interface ProductCardProps {
    id: string;
    title: string;
    brand?: string;
    price?: string | number;
    originalPrice?: number | null;
    targetPrice?: number | null;
    currency?: string;
    imageUrl?: string;
    status?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    onClick?: () => void;
    onDelete?: (e?: React.MouseEvent) => void;
    onToggleStatus?: (e?: React.MouseEvent) => void;
    onEdit?: (e?: React.MouseEvent) => void;
}

const priorityColor = {
    HIGH: { bg: "#fef2f2", text: "#dc2626", dark: "#fee2e2" },
    MEDIUM: { bg: "#fffbeb", text: "#d97706", dark: "#fef3c7" },
    LOW: { bg: "#f0fdf4", text: "#16a34a", dark: "#dcfce7" },
};

export const ProductCard: React.FC<ProductCardProps> = ({
    id,
    title,
    brand,
    price,
    originalPrice,
    targetPrice,
    currency = "₹",
    imageUrl,
    status,
    priority,
    onClick,
    onDelete,
    onToggleStatus,
    onEdit,
}) => {
    // Compute discount percentage if originalPrice is available
    const numericPrice = typeof price === "number" ? price : null;
    const discountPct =
        originalPrice && numericPrice && originalPrice > numericPrice
            ? Math.round(((originalPrice - numericPrice) / originalPrice) * 100)
            : null;

    const targetMet =
        numericPrice && targetPrice && numericPrice <= targetPrice;

    const isBought = status === "BOUGHT";

    return (
        <div
            onClick={onClick}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                cursor: "pointer",
                position: "relative",
            }}
            className="product-card group"
        >
            {/* ── Image / Placeholder ─────────────────────────────────── */}
            <div
                style={{
                    position: "relative",
                    aspectRatio: "3/4",
                    backgroundColor: "var(--muted)",
                    borderRadius: "var(--radius)",
                    overflow: "hidden",
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.4s ease",
                            opacity: isBought ? 0.6 : 1,
                            filter: isBought ? "grayscale(100%)" : "none",
                        }}
                        onMouseOver={(e) =>
                            (e.currentTarget.style.transform = "scale(1.05)")
                        }
                        onMouseOut={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                        }
                    />
                ) : (
                    /* Styled SVG placeholder */
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            color: "var(--muted-foreground)",
                            opacity: isBought ? 0.5 : 0.7,
                            background:
                                "linear-gradient(135deg, var(--muted), var(--card))",
                        }}
                    >
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                        >
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        <span style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            No image
                        </span>
                    </div>
                )}

                {/* ── Action Buttons overlay ───────────────────────────── */}
                <div
                    style={{
                        position: "absolute",
                        top: "0.5rem",
                        right: "0.5rem",
                        display: "flex",
                        gap: "0.4rem",
                        zIndex: 10,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {onToggleStatus && (
                        <ActionBtn
                            onClick={onToggleStatus}
                            title={isBought ? "Mark as Planned" : "Mark as Bought"}
                            color={isBought ? "#22c55e" : "var(--foreground)"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </ActionBtn>
                    )}
                    {onEdit && (
                        <ActionBtn onClick={onEdit} title="Edit Item" color="var(--foreground)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </ActionBtn>
                    )}
                    {onDelete && (
                        <ActionBtn onClick={onDelete} title="Delete Item" color="#ef4444">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                        </ActionBtn>
                    )}
                </div>

                {/* ── Bottom badges ────────────────────────────────────── */}
                <div style={{ position: "absolute", bottom: "0.5rem", left: "0.5rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    {isBought && (
                        <Badge bg="#22c55e" text="#fff">✓ Bought</Badge>
                    )}
                    {discountPct && !isBought && (
                        <Badge bg="#16a34a" text="#fff">↓ {discountPct}% off</Badge>
                    )}
                    {targetMet && !isBought && (
                        <Badge bg="var(--accent)" text="#fff">🎯 Target met!</Badge>
                    )}
                </div>

                {/* ── Priority chip (top-left) ─────────────────────────── */}
                {priority && !isBought && (
                    <div
                        style={{
                            position: "absolute",
                            top: "0.5rem",
                            left: "0.5rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            background: priorityColor[priority]?.bg || "var(--muted)",
                            color: priorityColor[priority]?.text || "var(--foreground)",
                            border: `1px solid ${priorityColor[priority]?.text}30`,
                        }}
                    >
                        {priority}
                    </div>
                )}
            </div>

            {/* ── Card text info ──────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {brand && (
                    <span
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "var(--accent)",
                        }}
                    >
                        {brand}
                    </span>
                )}
                <h3
                    style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        fontWeight: 400,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.4,
                        textDecoration: isBought ? "line-through" : "none",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {title}
                </h3>

                {/* Price row */}
                {price && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)" }}>
                            {price}
                        </span>
                        {originalPrice && numericPrice && originalPrice > numericPrice && (
                            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", textDecoration: "line-through" }}>
                                {currency}{originalPrice.toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Small helpers ──────────────────────────────────────────────────── */

function ActionBtn({ onClick, title, color, children }: {
    onClick?: (e?: React.MouseEvent) => void;
    title: string;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                backgroundColor: "var(--background)",
                border: "2px solid var(--border)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
            {children}
        </button>
    );
}

function Badge({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) {
    return (
        <span style={{
            backgroundColor: bg,
            color: text,
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
        }}>
            {children}
        </span>
    );
}
