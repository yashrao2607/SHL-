'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'I need assessments for a Java developer',
  'Looking for cognitive ability tests',
  'Need personality assessments for leadership roles',
  'Compare OPQ and Verify assessments',
];

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-lg text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-200/50"
        >
          <Sparkles className="h-8 w-8 text-white" aria-hidden="true" />
        </motion.div>

        {/* Welcome text */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-xl font-semibold text-foreground sm:text-2xl"
        >
          Welcome to SHL Assessment Advisor
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 text-sm text-muted-foreground sm:text-base"
        >
          Hi! I&apos;m your SHL Assessment Advisor. I can help you find the right
          assessments for your hiring needs. Tell me about the role you&apos;re
          hiring for, or try one of the suggestions below.
        </motion.p>

        {/* Suggestion chips */}
        <div className="flex flex-col gap-2.5">
          {SUGGESTIONS.map((suggestion, index) => (
            <motion.div
              key={suggestion}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full justify-start text-left text-sm font-normal h-auto py-3 px-4 border-dashed border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-all duration-200"
                onClick={() => onSuggestionClick(suggestion)}
                aria-label={`Send: ${suggestion}`}
              >
                <span className="mr-2 text-emerald-500">→</span>
                {suggestion}
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
