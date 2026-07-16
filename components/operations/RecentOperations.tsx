import type { Operation } from "@/data/operations";
import { AnimatePresence, motion } from "framer-motion";

type RecentOperationsProps = {
    operations: Operation[];
};

export default function RecentOperations({
    operations,
}: RecentOperationsProps) {
    return (
        <div className="h-full max-h-full space-y-3 overflow-y-auto pr-2">
            <AnimatePresence initial={false}>
                {operations.map((operation) => (
                    <motion.div
                        key={operation.id}
                        layout
                        initial={{
                            opacity: 0,
                            y: -15,
                            scale: 0.98,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            x: 40,
                        }}
                        transition={{
                            duration: 0.25,
                            ease: "easeOut",
                        }}
                        className="..."
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base">
                                {operation.icon}
                            </div>

                            <div>
                                <p className="font-medium text-white">
                                    {operation.title}
                                </p>
                                <p className="text-sm text-slate-400">
                                    {operation.date}
                                </p>
                            </div>
                        </div>

                        <p className={`text-lg font-bold ${operation.color}`}>
                            {operation.amount > 0 ? "+" : ""}
                            {operation.amount.toLocaleString("fr-FR")} €
                        </p>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
