"use client";

import React, { useState } from "react";

interface ProductSpecificationsProps {
    specifications?: Record<string, string>;
}

export const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({ specifications }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!specifications || Object.keys(specifications).length === 0) {
        return null;
    }

    return (
        <div className="mt-10">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left group mb-4 hover:opacity-70 transition-opacity"
                type="button"
            >
                <h3 className="text-lg font-semibold">Specifications</h3>
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
                <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <tbody>
                            {Object.entries(specifications).map(([key, value], index) => (
                                <tr
                                    key={key}
                                    className={index % 2 === 0 ? "bg-muted/30" : "bg-background"}
                                >
                                    <td className="px-4 py-3 font-medium text-sm text-foreground/80 w-1/3">
                                        {key}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
