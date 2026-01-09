"use client";

import React, { useState } from "react";

interface ProductHighlightsProps {
    highlights?: string[];
}

export const ProductHighlights: React.FC<ProductHighlightsProps> = ({ highlights }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!highlights || highlights.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left group hover:opacity-70 transition-opacity"
                type="button"
            >
                <h3 className="text-lg font-semibold">Key Features</h3>
                <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <ul className="space-y-2 mt-4">
                    {highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className="text-accent mt-1 flex-shrink-0">•</span>
                            <span className="text-sm text-muted-foreground leading-relaxed">
                                {highlight}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
