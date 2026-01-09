"use client";

import React from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface PriorityBadgeProps {
    priority: Priority;
    showLabel?: boolean;
    size?: "sm" | "md";
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
    priority,
    showLabel = true,
    size = "sm"
}) => {
    const config = {
        HIGH: {
            bg: "bg-red-500/20",
            text: "text-red-700 dark:text-red-400",
            border: "border-red-500/50",
            label: "High",
            icon: "!"
        },
        MEDIUM: {
            bg: "bg-yellow-500/20",
            text: "text-yellow-700 dark:text-yellow-400",
            border: "border-yellow-500/50",
            label: "Medium",
            icon: "•"
        },
        LOW: {
            bg: "bg-gray-500/20",
            text: "text-gray-700 dark:text-gray-400",
            border: "border-gray-500/50",
            label: "Low",
            icon: "−"
        }
    };

    const style = config[priority];
    const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses} font-medium`}
        >
            <span className="font-bold">{style.icon}</span>
            {showLabel && <span>{style.label}</span>}
        </span>
    );
};
