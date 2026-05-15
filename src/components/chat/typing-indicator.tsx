'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2" aria-label="Assistant is typing">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/40 dark:text-emerald-400 shadow-sm">
        <Bot className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted/80 backdrop-blur-sm border border-border/50 px-4 py-3">
          <motion.span
            className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] text-muted-foreground/60 pl-1"
        >
          Searching catalog...
        </motion.span>
      </div>
    </div>
  );
}
