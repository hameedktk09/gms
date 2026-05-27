import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingFeedbackProps {
  message: string;
  isVisible: boolean;
  onComplete: () => void;
}

export function FloatingFeedback({ message, isVisible, onComplete }: FloatingFeedbackProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -10, x: '-50%' }}
          className="floating-feedback"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
