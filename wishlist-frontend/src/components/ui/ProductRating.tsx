"use client";

import React from "react";

interface ProductRatingProps {
    rating?: number;
    reviewCount?: number;
}

export const ProductRating: React.FC<ProductRatingProps> = ({ rating, reviewCount }) => {
    if (!rating && !reviewCount) {
        return null;
    }

    // Render star icons
    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                // Full star
                stars.push(
                    <svg key={i} className="w-5 h-5 fill-yellow-400" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                );
            } else if (i === fullStars && hasHalfStar) {
                // Half star
                stars.push(
                    <svg key={i} className="w-5 h-5" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient id="half">
                                <stop offset="50%" stopColor="#facc15" />
                                <stop offset="50%" stopColor="#d1d5db" />
                            </linearGradient>
                        </defs>
                        <path
                            fill="url(#half)"
                            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                        />
                    </svg>
                );
            } else {
                // Empty star
                stars.push(
                    <svg key={i} className="w-5 h-5 fill-gray-300 dark:fill-gray-600" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                );
            }
        }
        return stars;
    };

    return (
        <div className="flex items-center gap-3 mb-6">
            {rating && (
                <>
                    <div className="flex items-center gap-1">{renderStars(rating)}</div>
                    <span className="text-lg font-semibold">{rating.toFixed(1)}</span>
                </>
            )}
            {reviewCount && (
                <span className="text-sm text-muted-foreground">
                    ({reviewCount.toLocaleString()} review{reviewCount !== 1 ? "s" : ""})
                </span>
            )}
        </div>
    );
};
