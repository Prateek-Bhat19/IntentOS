import { useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import { Product } from "@/types/product";
import { useAuth } from "@/context/AuthContext";

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const { isAuthenticated } = useAuth();

    const fetchProducts = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== "all") params.status = statusFilter;
            if (priorityFilter !== "all") params.priority = priorityFilter;

            const { data } = await api.get("/buy", { params });
            const mappedProducts = (data.items || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                url: item.link,
                link: item.link,
                imageUrl: item.metadata?.imageUrl || item.metadata?.images?.[0] || null,
                targetPrice: item.targetPrice,
                currentPrice: item.metadata?.price || item.metadata?.lastCheckedPrice || null,
                currency: item.metadata?.currency,
                brand: item.metadata?.brand,
                status: item.status,
                priority: item.priority,
            }));
            setProducts(mappedProducts);
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, statusFilter, priorityFilter]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const deleteProduct = async (productId: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            await api.delete(`/buy/${productId}`);
            fetchProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert("Failed to delete product");
        }
    };

    const toggleProductStatus = async (product: Product) => {
        const nextStatus = product.status === "BOUGHT" ? "PLANNED" : "BOUGHT";

        try {
            await api.patch(`/buy/${product.id}/status`, { status: nextStatus });
            fetchProducts();
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status");
        }
    };

    return {
        products,
        loading,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        refreshProducts: fetchProducts,
        deleteProduct,
        toggleProductStatus
    };
}
