"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type PageTransitionProps = {
    children: ReactNode;
};

export default function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            className="h-full min-h-0 flex-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
                duration: 0.2,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.div>
    );
}
