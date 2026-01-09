export interface Product {
    id: string;
    title: string;
    name?: string; // For compatibility
    url?: string;
    link?: string;
    imageUrl?: string | null;
    images?: string[];
    currentPrice?: number | null;
    targetPrice?: number | null;
    currency?: string;
    description?: string;
    brand?: string;
    createdAt?: string;
    status?: string; // "PLANNED" | "BOUGHT"
    priority?: "LOW" | "MEDIUM" | "HIGH";
    rating?: number;
    reviewCount?: number;
    highlights?: string[];
    specifications?: Record<string, string>;
    lastChecked?: string;
}
