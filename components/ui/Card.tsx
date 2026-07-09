import { motion } from "framer-motion";

type CardProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  delay = 0,
}: CardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay,
        ease: "easeOut",
      }}
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-4 shadow-lg shadow-black/20 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-3 shrink-0">
          {title && (
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </motion.section>
  );
}