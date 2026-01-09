

/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import { EditItemModal } from "@/components/EditItemModal";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { ProductRating } from "@/components/ui/ProductRating";
import { ProductHighlights } from "@/components/ui/ProductHighlights";
import { ProductSpecifications } from "@/components/ui/ProductSpecifications";

interface Product {
    id: string;
    url: string;
    name?: string;
    title?: string;
    imageUrl?: string | null;
    images?: string[];
    currentPrice?: number | null;
    targetPrice?: number | null;
    currency?: string;
    description?: string;
    brand?: string;
    createdAt?: string;
    status?: string;
    rating?: number;
    reviewCount?: number;
    highlights?: string[];
    specifications?: Record<string, string>;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchProduct = async () => {
            try {
                const { data } = await api.get("/buy");
                if (Array.isArray(data?.items)) {
                    const foundItem = data.items.find((p: any) => p.id === id);

                    if (foundItem) {
                        setProduct({
                            id: foundItem.id,
                            title: foundItem.title,
                            url: foundItem.link || foundItem.metadata?.source || "",
                            link: foundItem.link, // For edit modal
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
        };
        fetchProduct();
    }, [id]);

    if (loading) return (
        <div className="container min-h-[60vh] flex flex-col items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading details...</div>
        </div>
    );

    if (!product) return (
        <div className="container min-h-[60vh] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-serif mb-4">Item not found</h2>
            <Link href="/dashboard"><Button variant="outline">Back to Wishlist</Button></Link>
        </div>
    );

    const refreshProduct = () => {
        window.location.reload();
    };

    return (
        <div className="container py-12 md:py-20 animate-fade-in-up">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to list
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
                {/* Image Section */}
                <div>
                    <ImageGallery
                        images={product.images || (product.imageUrl ? [product.imageUrl] : [])}
                        productName={product.name || product.title || "Product"}
                    />

                    {/* Status Badge */}
                    {product.status === "BOUGHT" && (
                        <div className="mt-4 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-full uppercase tracking-widest shadow-lg text-center">
                            Purchased
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="flex flex-col pt-2">
                    <div className="mb-8">
                        {product.brand && (
                            <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-3">
                                {product.brand}
                            </h2>
                        )}
                        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-foreground mb-6">
                            {product.name || product.title}
                        </h1>

                        {/* Rating */}
                        <ProductRating rating={product.rating} reviewCount={product.reviewCount} />

                        <div className="flex items-baseline gap-4">
                            <p className="text-2xl md:text-3xl font-medium tracking-tight">
                                {product.currentPrice
                                    ? `${product.currency || "₹"}${product.currentPrice.toLocaleString()}`
                                    : product.targetPrice
                                        ? `Target: ₹${product.targetPrice.toLocaleString()}`
                                        : "Price N/A"
                                }
                            </p>
                            {product.targetPrice && product.currentPrice && (
                                <p className="text-sm text-muted-foreground">
                                    Target: <span className="font-medium">₹{product.targetPrice.toLocaleString()}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Highlights - Show as collapsible Key Features */}
                    {product.highlights && product.highlights.length > 0 && (
                        <ProductHighlights highlights={product.highlights} />
                    )}

                    {/* Description - Only show if no highlights exist */}
                    {(!product.highlights || product.highlights.length === 0) && product.description && (
                        <div className="prose prose-stone dark:prose-invert max-w-none mb-10 text-muted-foreground leading-relaxed">
                            <p>{product.description}</p>
                        </div>
                    )}

                    {/* Specifications */}
                    <ProductSpecifications specifications={product.specifications} />

                    <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button size="lg" className="w-full h-14 text-lg">
                                {product.status === 'BOUGHT' ? 'Buy Again' : 'Available at Source'}
                            </Button>
                        </a>
                        <Button variant="outline" size="lg" className="h-14 px-8 border-border" onClick={() => setIsEditModalOpen(true)}>
                            Edit Details
                        </Button>
                    </div>

                    <div className="mt-12 pt-6 border-t border-border flex justify-between text-xs text-muted-foreground uppercase tracking-wider">
                        <span>Added {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "Unknown"}</span>
                        <span>ID: {product.id.slice(0, 8)}...</span>
                    </div>
                </div>
            </div>

            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={refreshProduct}
                item={{
                    id: product.id,
                    title: product.title || product.name || "",
                    link: product.url,
                    targetPrice: product.targetPrice,
                }}
            />
        </div>
    );
}
