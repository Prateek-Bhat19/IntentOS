"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { AddItemModal } from "@/components/AddItemModal";
import { EditItemModal } from "@/components/EditItemModal";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/product";

export default function DashboardPage() {
    const {
        products,
        loading,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        refreshProducts,
        deleteProduct,
        toggleProductStatus
    } = useProducts();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Product | null>(null);

    if (loading) {
        return (
            <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading your wishlist...</div>
            </div>
        );
    }

    const plannedCount = products.filter(p => p.status === "PLANNED").length;

    return (
        <div className="container py-12 md:py-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold">Your Wishlist</h1>
                    <p className="text-muted-foreground mt-2">
                        {plannedCount} item{plannedCount !== 1 ? "s" : ""} to buy
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="lg">
                    + Add Item
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground"
                    >
                        <option value="all">All</option>
                        <option value="PLANNED">Planned</option>
                        <option value="BOUGHT">Bought</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Priority:</label>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground"
                    >
                        <option value="all">All</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                </div>

                {(statusFilter !== "all" || priorityFilter !== "all") && (
                    <button
                        onClick={() => {
                            setStatusFilter("all");
                            setPriorityFilter("all");
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                    <p className="text-muted-foreground mb-4 text-lg">
                        {statusFilter !== "all" || priorityFilter !== "all"
                            ? "No items match your filters"
                            : "Your wishlist is empty"}
                    </p>
                    {statusFilter === "all" && priorityFilter === "all" && (
                        <Button onClick={() => setIsModalOpen(true)}>Add Your First Item</Button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "1.5rem"
                }}>
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
                                            : "Price N/A"
                                }
                                imageUrl={product.imageUrl || undefined}
                                status={product.status}
                                priority={product.priority}
                                onDelete={() => deleteProduct(product.id)}
                                onToggleStatus={() => toggleProductStatus(product)}
                                onEdit={(e) => {
                                    e?.stopPropagation();
                                    e?.preventDefault();
                                    setEditingItem(product);
                                    setIsEditModalOpen(true);
                                }}
                            />
                        </Link>
                    ))}
                </div>
            )}

            <AddItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refreshProducts}
            />

            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={refreshProducts}
                item={editingItem}
            />
        </div>
    );
}
