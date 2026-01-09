import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Product } from "@/types/product";

export function useProduct(id: string | null) {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProduct = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await api.get("/buy");
            if (Array.isArray(data?.items)) {
                const foundItem = data.items.find((p: any) => p.id === id);

                if (foundItem) {
                    setProduct({
                        id: foundItem.id,
                        title: foundItem.title,
                        name: foundItem.title, // Map to name as well for compatibility
                        url: foundItem.link || foundItem.metadata?.source || "",
                        link: foundItem.link,
                        imageUrl: foundItem.metadata?.imageUrl || foundItem.metadata?.images?.[0] || null,
                        images: foundItem.metadata?.images || (foundItem.metadata?.imageUrl ? [foundItem.metadata.imageUrl] : []),
                        targetPrice: foundItem.targetPrice,
                        currentPrice: foundItem.metadata?.price || foundItem.metadata?.lastCheckedPrice || null,
                        currency: foundItem.metadata?.currency,
                        brand: foundItem.metadata?.brand,
                        description: foundItem.metadata?.description,
                        status: foundItem.status,
                        createdAt: foundItem.createdAt,
                        rating: foundItem.metadata?.rating,
                        reviewCount: foundItem.metadata?.reviewCount,
                        highlights: foundItem.metadata?.highlights,
                        specifications: foundItem.metadata?.specifications,
                        priority: foundItem.priority,
                        lastChecked: foundItem.metadata?.checkedAt,
                    } as Product);
                } else {
                    setProduct(null);
                }
            }
        } catch (err) {
            console.error("Failed to fetch product", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    const refreshMetadata = async () => {
        if (!product) return;
        setRefreshing(true);
        try {
            await api.post(`/buy/${product.id}/refresh-metadata`);
            alert("Metadata refresh queued! The page will reload with updated data shortly.");
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error("Failed to refresh metadata:", error);
            alert(error.response?.data?.error || "Failed to refresh metadata");
            setRefreshing(false);
        }
    };

    return {
        product,
        loading,
        refreshing,
        refreshProduct: fetchProduct,
        refreshMetadata
    };
}
