"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/Button";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AddItemModal } from "@/components/AddItemModal";
import { EditItemModal } from "@/components/EditItemModal";

interface Product {
    id: string;
    title: string;
    url?: string;
    link?: string;
    imageUrl?: string | null;
    targetPrice?: number | null;
    currentPrice?: number | null;
    currency?: string;
    brand?: string;
    status?: string;
}

export default function DashboardPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Product | null>(null);
    const { isAuthenticated } = useAuth();

    const fetchProducts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await api.get("/buy");
            // Backend returns { items: [], meta: { ... } }
            // We need to map the backend items to our frontend Product interface
            // handling the nested `metadata` JSON field.
            const mappedProducts = (data.items || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                url: item.link,
                link: item.link, // Keep both if needed or normalize
                imageUrl: item.metadata?.imageUrl || null,
                targetPrice: item.targetPrice,
                // Check metadata for fetched price
                currentPrice: item.metadata?.price || item.metadata?.lastCheckedPrice || null,
                currency: item.metadata?.currency,
                brand: item.metadata?.brand,
                status: item.status,
            }));
            setProducts(mappedProducts);
        } catch (err) {
            console.error("Failed to fetch products", err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Just in case
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            await api.delete(`/buy/${id}`);
            fetchProducts(); // Refresh list
        } catch (err) {
            console.error("Failed to delete item", err);
            alert("Failed to delete item");
        }
    };

    const handleToggleStatus = async (product: Product, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newStatus = product.status === "BOUGHT" ? "PLANNED" : "BOUGHT";

        try {
            await api.patch(`/buy/${product.id}/status`, { status: newStatus });
            fetchProducts(); // Refresh list
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: "4rem 0", textAlign: "center", color: "var(--muted-foreground)" }}>Loading your wishlist...</div>;
    }

    return (
        <div className="container" style={{ paddingBottom: "4rem" }}>
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "2rem 0 3rem",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>My Wishlist</h1>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                    <Button size="sm" onClick={() => setIsModalOpen(true)}>Add Item</Button>
                </div>
            </header>

            {products.length === 0 ? (
                <div style={{ textAlign: "center", padding: "6rem 0", color: "var(--muted-foreground)" }}>
                    <p style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>Your wishlist is empty.</p>
                    <Button onClick={() => setIsModalOpen(true)}>Add your first item</Button>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "2rem 1.5rem",
                    }}
                >
                    {products.map((product) => (
                        <Link key={product.id} href={`/product/${product.id}`} style={{ textDecoration: "none" }}>
                            <ProductCard
                                id={product.id}
                                title={product.title || "Untitled Item"}
                                brand={product.brand || "Unknown Brand"}
                                price={
                                    product.currentPrice
                                        ? `${product.currency || "$"}${product.currentPrice}`
                                        : product.targetPrice
                                            ? `Target: $${product.targetPrice}`
                                            : "Price N/A"
                                }
                                imageUrl={product.imageUrl || undefined}
                                status={product.status}
                                onDelete={() => handleDelete(product.id)}
                                onToggleStatus={() => handleToggleStatus(product)}
                                onEdit={(e) => {
                                    e?.stopPropagation(); // Block link navigation
                                    e?.preventDefault(); // Block link navigation
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
                onSuccess={fetchProducts}
            />

            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchProducts}
                item={editingItem}
            />
        </div>
    );
}
