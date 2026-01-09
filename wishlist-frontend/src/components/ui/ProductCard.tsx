/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";

interface ProductCardProps {
    id: string;
    title: string;
    brand?: string;
    price?: string | number;
    imageUrl?: string;
    status?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    onClick?: () => void;
    onDelete?: (e?: React.MouseEvent) => void;
    onToggleStatus?: (e?: React.MouseEvent) => void;
    onEdit?: (e?: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    id,
    title,
    brand,
    price,
    imageUrl,
    status,
    priority,
    onClick,
    onDelete,
    onToggleStatus,
    onEdit,
}) => {
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
                            opacity: status === "BOUGHT" ? 0.6 : 1,
                            filter: status === "BOUGHT" ? "grayscale(100%)" : "none",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--muted-foreground)",
                            opacity: status === "BOUGHT" ? 0.6 : 1,
                        }}
                    >
                        No Image
                    </div>
                )}

                {/* Action Buttons Overlay */}
                <div
                    style={{
                        position: "absolute",
                        top: "0.5rem",
                        right: "0.5rem",
                        display: "flex",
                        gap: "0.5rem",
                        zIndex: 10,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {onToggleStatus && (
                        <button
                            onClick={onToggleStatus}
                            title={status === "BOUGHT" ? "Mark as Planned" : "Mark as Bought"}
                            style={{
                                backgroundColor: "var(--background)",
                                border: "2px solid var(--border)",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: status === "BOUGHT" ? "#22c55e" : "var(--foreground)",
                                transition: "all 0.2s",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    )}

                    {onEdit && (
                        <button
                            onClick={onEdit}
                            title="Edit Item"
                            style={{
                                backgroundColor: "var(--background)",
                                border: "2px solid var(--border)",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--foreground)",
                                transition: "all 0.2s",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    )}

                    {onDelete && (
                        <button
                            onClick={onDelete}
                            title="Delete Item"
                            style={{
                                backgroundColor: "var(--background)",
                                border: "2px solid var(--border)",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#ef4444",
                                transition: "all 0.2s",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    )}
                </div>

                {status === "BOUGHT" && (
                    <div style={{
                        position: "absolute",
                        bottom: "0.5rem",
                        left: "0.5rem",
                        backgroundColor: "#22c55e",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase"
                    }}>
                        Bought
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {brand && (
                    <span
                        style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--foreground)",
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
                        textDecoration: status === "BOUGHT" ? "line-through" : "none",
                    }}
                >
                    {title}
                </h3>
                {price && (
                    <span
                        style={{
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            marginTop: "0.25rem",
                            color: "var(--foreground)",
                        }}
                    >
                        {price}
                    </span>
                )}
            </div>
        </div>
    );
};
