"use client";

import React from "react";

interface PriceComparisonProps {
    currentPrice?: number;
    targetPrice?: number;
    currency?: string;
    lastChecked?: string;
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({
    currentPrice,
    targetPrice,
    currency = "₹",
    lastChecked
}) => {
    if (!currentPrice && !targetPrice) {
        return (
            <div className="text-sm text-muted-foreground">
                Price unavailable
            </div>
        );
    }

    // Calculate if it's a good deal
    const isGoodDeal = currentPrice && targetPrice && currentPrice < targetPrice;
    const isOverBudget = currentPrice && targetPrice && currentPrice > targetPrice;
    const priceDiff = currentPrice && targetPrice ?
        Math.abs(currentPrice - targetPrice) : 0;
    const percentDiff = currentPrice && targetPrice ?
        ((priceDiff / targetPrice) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-2">
            {/* Current Price */}
            {currentPrice && (
                <div className="flex items-baseline gap-3">
                    <span className="text-2xl md:text-3xl font-medium tracking-tight">
                        {currency}{currentPrice.toLocaleString()}
                    </span>

                    {/* Deal Indicator */}
                    {targetPrice && (
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded ${isGoodDeal
                                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                : isOverBudget
                                    ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                    : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                            }`}>
                            {isGoodDeal && `↓ ${percentDiff}% below target`}
                            {isOverBudget && `↑ ${percentDiff}% above target`}
                            {!isGoodDeal && !isOverBudget && "At target"}
                        </span>
                    )}
                </div>
            )}

            {/* Target Price */}
            {targetPrice && (
                <div className="text-sm text-muted-foreground">
                    Target: <span className="font-medium">{currency}{targetPrice.toLocaleString()}</span>
                    {currentPrice && priceDiff > 0 && (
                        <span className="ml-2">
                            ({isGoodDeal ? "Save" : "Over"} {currency}{priceDiff.toLocaleString()})
                        </span>
                    )}
                </div>
            )}

            {/* Last Checked */}
            {lastChecked && (
                <div className="text-xs text-muted-foreground">
                    Last checked: {new Date(lastChecked).toLocaleString()}
                </div>
            )}

            {/* No target set */}
            {!targetPrice && currentPrice && (
                <div className="text-sm text-muted-foreground">
                    Set a target price to track deals
                </div>
            )}
        </div>
    );
};
