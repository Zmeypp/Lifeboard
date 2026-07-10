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
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      type={type}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}