

/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useState, use } from "react";
import { EditItemModal } from "@/components/EditItemModal";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { ProductRating } from "@/components/ui/ProductRating";
import { ProductHighlights } from "@/components/ui/ProductHighlights";
import { ProductSpecifications } from "@/components/ui/ProductSpecifications";
import { PriceComparison } from "@/components/ui/PriceComparison";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { useProduct } from "@/hooks/useProduct";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { product, loading, refreshing, refreshProduct, refreshMetadata } = useProduct(id);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
                        <div className="flex items-center gap-3 mb-3">
                            {product.brand && (
                                <h2 className="text-sm font-bold tracking-widest uppercase text-accent">
                                    {product.brand}
                                </h2>
                            )}
                            {product.priority && <PriorityBadge priority={product.priority} />}
                        </div>

                        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-foreground mb-6">
                            {product.name || product.title}
                        </h1>

                        {/* Rating */}
                        <ProductRating rating={product.rating} reviewCount={product.reviewCount} />

                        {/* Price Comparison */}
                        <PriceComparison
                            currentPrice={product.currentPrice || undefined}
                            targetPrice={product.targetPrice || undefined}
                            currency={product.currency}
                            lastChecked={product.lastChecked}
                        />
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
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-6 border-border"
                            onClick={refreshMetadata}
                            disabled={refreshing}
                        >
                            {refreshing ? "Refreshing..." : "Refresh Data"}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-8 border-border"
                            onClick={() => setIsEditModalOpen(true)}
                        >
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
