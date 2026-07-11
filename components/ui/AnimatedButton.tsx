"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type AnimatedButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
};

export default function AnimatedButton({
  children,
  className = "",
  type = "button",
  style,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      type={type}
      className={`touch-manipulation select-none ${className}`}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}