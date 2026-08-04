'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function Template({ children }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
