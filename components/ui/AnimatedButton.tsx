"use client";

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type AnimatedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function AnimatedButton({
  children,
  className = "",
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}