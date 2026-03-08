"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { AddItemModal } from "@/components/AddItemModal";
import { EditItemModal } from "@/components/EditItemModal";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/product";

/* ── Toast helper ─────────────────────────────────────────────────── */
type ToastType = { msg: string; kind: "success" | "error" } | null;

function useToast() {
    const [toast, setToast] = useState<ToastType>(null);
    const show = (msg: string, kind: "success" | "error" = "success") => {
        setToast({ msg, kind });
        setTimeout(() => setToast(null), 3000);
    };
    return { toast, show };
}

/* ── Skeleton card ────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div className="skeleton" style={{ aspectRatio: "3/4", width: "100%" }} />
            <div className="skeleton" style={{ height: "0.7rem", width: "40%", borderRadius: "4px" }} />
            <div className="skeleton" style={{ height: "0.85rem", width: "90%", borderRadius: "4px" }} />
            <div className="skeleton" style={{ height: "0.85rem", width: "60%", borderRadius: "4px" }} />
        </div>
    );
}

/* ── Stat card ────────────────────────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div style={{
            padding: "1.25rem 1.5rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
        }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                {label}
            </span>
            <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.1 }}>
                {value}
            </span>
            {sub && <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{sub}</span>}
        </div>
    );
}

/* ── Filter pill group ────────────────────────────────────────────── */
function PillGroup<T extends string>({
    label, options, value, onChange,
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
            </span>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    className={`filter-tab${value === opt.value ? " active" : ""}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
    const {
        products,
        loading,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        refreshProducts,
        deleteProduct: _deleteProduct,
        toggleProductStatus: _toggleProductStatus,
    } = useProducts();

    const { toast, show: showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Product | null>(null);

    /* Wrapped delete with toast */
    const deleteProduct = async (id: string) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            await _deleteProduct(id);
            showToast("Item deleted");
        } catch {
            showToast("Failed to delete", "error");
        }
    };

    /* Wrapped toggle with toast */
    const toggleProductStatus = async (product: Product) => {
        try {
            await _toggleProductStatus(product);
            const next = product.status === "BOUGHT" ? "Planned" : "Bought";
            showToast(`Marked as ${next} ✓`);
        } catch {
            showToast("Failed to update status", "error");
        }
    };

    /* Stats */
    const allItems = products;
    const planned = allItems.filter(p => p.status === "PLANNED");
    const bought = allItems.filter(p => p.status === "BOUGHT");
    const totalValue = planned
        .reduce((sum, p) => sum + (p.currentPrice || p.targetPrice || 0), 0);

    return (
        <div className="container py-12 md:py-20">

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold">Your Wishlist</h1>
                    <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
                        {planned.length} item{planned.length !== 1 ? "s" : ""} to buy
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="lg">+ Add Item</Button>
            </div>

            {/* ── Stats row ──────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <StatCard label="Total Items" value={allItems.length} />
                <StatCard
                    label="Planned Value"
                    value={totalValue > 0 ? `₹${totalValue.toLocaleString()}` : "—"}
                    sub="based on current prices"
                />
                <StatCard
                    label="Bought"
                    value={bought.length}
                    sub={allItems.length > 0 ? `${Math.round((bought.length / allItems.length) * 100)}% of list` : ""}
                />
            </div>

            {/* ── Filters ────────────────────────────────────────── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem", alignItems: "center" }}>
                <PillGroup
                    label="Status"
                    options={[
                        { label: "All", value: "all" },
                        { label: "Planned", value: "PLANNED" },
                        { label: "Bought", value: "BOUGHT" },
                    ]}
                    value={statusFilter as any}
                    onChange={setStatusFilter}
                />
                <div style={{ width: "1px", height: "1.5rem", background: "var(--border)" }} />
                <PillGroup
                    label="Priority"
                    options={[
                        { label: "All", value: "all" },
                        { label: "High", value: "HIGH" },
                        { label: "Medium", value: "MEDIUM" },
                        { label: "Low", value: "LOW" },
                    ]}
                    value={priorityFilter as any}
                    onChange={setPriorityFilter}
                />
                {(statusFilter !== "all" || priorityFilter !== "all") && (
                    <button
                        onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}
                        style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* ── Content ────────────────────────────────────────── */}
            {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : products.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", textAlign: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: "var(--muted-foreground)", marginBottom: "1rem", opacity: 0.5 }}>
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <p style={{ color: "var(--muted-foreground)", marginBottom: "1rem", fontSize: "1.05rem" }}>
                        {statusFilter !== "all" || priorityFilter !== "all"
                            ? "No items match your filters"
                            : "Your wishlist is empty"}
                    </p>
                    {statusFilter === "all" && priorityFilter === "all" && (
                        <Button onClick={() => setIsModalOpen(true)}>Add Your First Item</Button>
                    )}
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
                    {products.map((product) => (
                        <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <ProductCard
                                id={product.id}
                                title={product.title}
                                brand={product.brand}
                                price={
                                    product.currentPrice
                                        ? `${product.currency || "₹"}${product.currentPrice.toLocaleString()}`
                                        : product.targetPrice
                                            ? `Target: ${product.currency || "₹"}${product.targetPrice.toLocaleString()}`
                                            : undefined
                                }
                                originalPrice={product.originalPrice}
                                targetPrice={product.targetPrice || undefined}
                                currency={product.currency || "₹"}
                                imageUrl={product.imageUrl || undefined}
                                status={product.status}
                                priority={product.priority}
                                onDelete={(e) => { e?.stopPropagation(); e?.preventDefault(); deleteProduct(product.id); }}
                                onToggleStatus={(e) => { e?.stopPropagation(); e?.preventDefault(); toggleProductStatus(product); }}
                                onEdit={(e) => { e?.stopPropagation(); e?.preventDefault(); setEditingItem(product); setIsEditModalOpen(true); }}
                            />
                        </Link>
                    ))}
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────── */}
            <AddItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { refreshProducts(); showToast("Item added ✓"); }}
            />
            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => { refreshProducts(); showToast("Item updated ✓"); }}
                item={editingItem}
            />

            {/* ── Toast ──────────────────────────────────────────── */}
            {toast && (
                <div className={`toast toast-${toast.kind}`}>
                    {toast.kind === "success" ? "✓" : "✕"} {toast.msg}
                </div>
            )}
        </div>
    );
}
