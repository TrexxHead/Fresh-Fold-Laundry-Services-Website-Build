"use client";

import { motion } from "motion/react";
import { motionTokens } from "@/lib/motion";

export function LaundryVisual() {
  const fabricTransition = { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth };
  return <motion.div className="laundry-visual" aria-label="Abstract folded laundry and basket illustration" role="img" initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} transition={fabricTransition}>
    <motion.div className="visual-sun" initial={{ opacity: 0, scale: .72 }} animate={{ opacity: .9, scale: 1 }} transition={{ ...fabricTransition, delay: .08 }}/><div className="visual-line"/>
    <motion.div className="fabric fabric-one" initial={{ opacity: 0, y: -18, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ ...fabricTransition, delay: .12 }}><span>Fresh</span></motion.div>
    <motion.div className="fabric fabric-two" initial={{ opacity: 0, y: -18, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 4 }} transition={{ ...fabricTransition, delay: .2 }}><span>Folded</span></motion.div>
    <motion.div className="fabric fabric-three" initial={{ opacity: 0, y: -18, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ ...fabricTransition, delay: .28 }}><span>Returned</span></motion.div>
    <div className="basket"><span/><span/><span/><span/></div>
    <motion.div className="visual-note" initial={{ opacity: 0, y: 10, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ ...fabricTransition, delay: .36 }}><strong>Pickup to return</strong><small>Every step confirmed</small></motion.div>
  </motion.div>;
}
