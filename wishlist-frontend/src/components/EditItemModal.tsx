"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import api from "@/lib/api";

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    item: {
        id: string;
        title: string;
        link?: string;
        targetPrice?: number | null;
        priority?: string;
    } | null;
}

export function EditItemModal({ isOpen, onClose, onSuccess, item }: EditItemModalProps) {
    const [title, setTitle] = useState("");
    const [link, setLink] = useState("");
    const [targetPrice, setTargetPrice] = useState("");
    const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setLink(item.link || "");
            setTargetPrice(item.targetPrice ? item.targetPrice.toString() : "");
            setPriority((item.priority as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM");
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await api.put(`/buy/${item.id}`, {
                title,
                link: link || undefined,
                targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
                priority,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to update item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
                backdropFilter: "blur(2px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "var(--background)",
                    padding: "2rem",
                    borderRadius: "var(--radius)",
                    width: "100%",
                    maxWidth: "400px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>Edit Item</h2>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Input
                        label="Title"
                        placeholder="Product Name"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        autoFocus
                    />

                    <Input
                        label="Link (Optional)"
                        placeholder="https://example.com/product"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        type="url"
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input
                            label="Target Price"
                            placeholder="0.00"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            type="number"
                            min="0"
                            step="0.01"
                        />

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                style={{
                                    padding: "0.6rem 0.8rem",
                                    fontSize: "0.95rem",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius)",
                                    background: "var(--background)",
                                    color: "var(--foreground)",
                                    outline: "none",
                                    width: "100%",
                                    height: "42px"
                                }}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {error && <p style={{ color: "#e34d4d", fontSize: "0.9rem" }}>{error}</p>}

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
