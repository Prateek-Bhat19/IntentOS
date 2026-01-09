"use client";

import { motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

export function PullToDarkToggle() {
    const { theme, toggleTheme } = useTheme();
    const y = useMotionValue(0);
    const [isDragging, setIsDragging] = useState(false);

    const PULL_THRESHOLD = 100;
    const IDLE_ROPE_LENGTH = 60;

    const yVelocity = useVelocity(y);

    const springY = useSpring(y, {
        stiffness: 50,
        damping: 8,
        mass: 1.5
    });

    const swayFromVelocity = useTransform(yVelocity, [-1000, 1000], [-25, 25]);
    const sway = useSpring(swayFromVelocity, {
        stiffness: 30,
        damping: 6,
        mass: 2
    });

    const ropePath = useTransform([springY, sway], ([yPos, swayX]) => {
        const length = (yPos as number) + IDLE_ROPE_LENGTH;
        const swayAmount = swayX as number;

        const startX = 50;
        const startY = 3;
        const endX = 50 + swayAmount;
        const endY = length;

        const midY = (startY + endY) / 2;
        const midX1 = startX + (swayAmount * 0.3) + 5;
        const midX2 = startX + (swayAmount * 0.7) + 5;

        return `M ${startX} ${startY} 
                C ${midX1} ${midY * 0.4}, 
                  ${midX2} ${midY * 1.6}, 
                  ${endX} ${endY}`;
    });

    const handleDragEnd = (_event: any, info: any) => {
        setIsDragging(false);

        // Check the offset (how far it was dragged)
        if (info.offset.y > PULL_THRESHOLD) {
            toggleTheme();
        }
    };

    return (
        <div className="fixed top-0 right-4 md:right-8 z-50">
            <div className="w-3 h-3 bg-foreground/60 rounded-full mx-auto" />

            <motion.svg
                width="100"
                height="250"
                viewBox="0 0 100 250"
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ overflow: "visible" }}
            >
                <motion.path
                    stroke="var(--foreground)"
                    strokeWidth="4"
                    fill="none"
                    opacity="0.6"
                    strokeLinecap="round"
                    animate={!isDragging ? {
                        d: [
                            `M 50 3 C 56 ${IDLE_ROPE_LENGTH * 0.3}, 58 ${IDLE_ROPE_LENGTH * 0.6}, 50 ${IDLE_ROPE_LENGTH}`,
                            `M 50 3 C 50 ${IDLE_ROPE_LENGTH * 0.3}, 50 ${IDLE_ROPE_LENGTH * 0.6}, 50 ${IDLE_ROPE_LENGTH}`,
                            `M 50 3 C 44 ${IDLE_ROPE_LENGTH * 0.3}, 42 ${IDLE_ROPE_LENGTH * 0.6}, 50 ${IDLE_ROPE_LENGTH}`,
                            `M 50 3 C 50 ${IDLE_ROPE_LENGTH * 0.3}, 50 ${IDLE_ROPE_LENGTH * 0.6}, 50 ${IDLE_ROPE_LENGTH}`,
                            `M 50 3 C 56 ${IDLE_ROPE_LENGTH * 0.3}, 58 ${IDLE_ROPE_LENGTH * 0.6}, 50 ${IDLE_ROPE_LENGTH}`,
                        ]
                    } : {}}
                    transition={!isDragging ? {
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    } : {}}
                    style={isDragging ? { d: ropePath } : {}}
                />
            </motion.svg>

            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 150 }}
                dragElastic={0.4}
                dragSnapToOrigin
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                style={{ y, marginTop: `${IDLE_ROPE_LENGTH - 5}px` }}
                className="cursor-grab active:cursor-grabbing relative"
                whileHover={{ scale: 1.1 }}
                whileDrag={{ scale: 1.15 }}
            >
                <motion.div
                    className="w-14 h-14 rounded-full border-2 shadow-2xl flex items-center justify-center transition-all backdrop-blur-sm"
                    style={{
                        borderColor: "var(--foreground)",
                        backgroundColor: isDragging && y.get() > PULL_THRESHOLD
                            ? "var(--accent)"
                            : "var(--background)",
                        boxShadow: isDragging && y.get() > PULL_THRESHOLD
                            ? "0 0 20px var(--accent)"
                            : "0 10px 30px rgba(0,0,0,0.2)"
                    }}
                    animate={{
                        rotate: isDragging ? [0, -5, 5, -5, 0] : 0
                    }}
                    transition={{
                        rotate: {
                            duration: 0.7,
                            repeat: isDragging ? Infinity : 0,
                            ease: "easeInOut"
                        }
                    }}
                >
                    <motion.svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={{
                            rotate: theme === "dark" ? 180 : 0
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        {theme === "light" ? (
                            <>
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </>
                        ) : (
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        )}
                    </motion.svg>
                </motion.div>

                {!isDragging && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded"
                    >

                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
