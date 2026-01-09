/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";

interface ImageGalleryProps {
    images: string[];
    productName: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName }) => {
    const [selectedImage, setSelectedImage] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/30 rounded-2xl">
                <span className="text-4xl opacity-20">📷</span>
                <span className="mt-4 text-sm font-medium">No Images Available</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted shadow-sm">
                <img
                    src={images[selectedImage]}
                    alt={`${productName} - Image ${selectedImage + 1}`}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-700"
                />
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                    {images.slice(0, 8).map((img, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`relative aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all duration-200 ${selectedImage === index
                                    ? "border-foreground scale-95"
                                    : "border-transparent hover:border-muted-foreground/50"
                                }`}
                        >
                            <img
                                src={img}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
