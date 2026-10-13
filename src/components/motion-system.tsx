"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motionTokens } from "@/lib/motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      {children}
    </MotionConfig>
  );
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.main
        id="main-content"
        key={pathname}
        className="route-motion"
        initial={{ opacity: 0, y: motionTokens.distance.small }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -motionTokens.distance.small }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: motionTokens.distance.medium }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -48px" }}
      transition={{ duration: motionTokens.duration.slow, delay, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className }: { children: ReactNode; className: string }) {
  return (
    <motion.article
      className={className}
      initial={{ opacity: 0, y: motionTokens.distance.medium }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.article>
  );
}
