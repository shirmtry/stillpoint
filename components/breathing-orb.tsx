"use client";

import { motion } from "framer-motion";

export function BreathingOrb({ active, label }: { active: boolean; label?: string }) {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full bg-primary/15 blur-2xl"
        animate={active ? { scale: [1, 1.12, 1], opacity: [0.45, 0.85, 0.45] } : { scale: 1, opacity: 0.35 }}
        transition={{ duration: 8, repeat: active ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-4 rounded-full border border-primary/30"
        animate={active ? { scale: [0.95, 1.06, 0.95], opacity: [0.5, 1, 0.5] } : { scale: 0.98, opacity: 0.6 }}
        transition={{ duration: 8, repeat: active ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-10 rounded-full border border-primary/20"
        animate={active ? { scale: [0.9, 1.02, 0.9] } : { scale: 1 }}
        transition={{ duration: 8, repeat: active ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
      />
      <motion.span
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/35 to-[var(--accent-2)]/25 text-[11px] font-medium text-primary-foreground/90"
        animate={active ? { scale: [0.92, 1.04, 0.92] } : { scale: 1 }}
        transition={{ duration: 8, repeat: active ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
      >
        {label ?? "thở"}
      </motion.span>
    </div>
  );
}