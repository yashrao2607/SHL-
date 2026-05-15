'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback?: 'positive' | 'negative' | null;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

export function FeedbackButtons({
  messageId,
  currentFeedback,
  onFeedback,
}: FeedbackButtonsProps) {
  const [localFeedback, setLocalFeedback] = useState<'positive' | 'negative' | null>(
    currentFeedback ?? null
  );

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    if (localFeedback === feedback) return;
    setLocalFeedback(feedback);
    onFeedback(messageId, feedback);
    toast.success('Thanks for your feedback!', {
      duration: 2000,
      position: 'top-center',
    });
  };

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <AnimatePresence mode="wait">
        {localFeedback === null ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground/40 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              onClick={() => handleFeedback('positive')}
              aria-label="Helpful response"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              onClick={() => handleFeedback('negative')}
              aria-label="Not helpful response"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={localFeedback}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            {localFeedback === 'positive' ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <ThumbsUp className="h-3.5 w-3.5 fill-emerald-600" />
                <span className="text-[10px] font-medium">Helpful</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <ThumbsDown className="h-3.5 w-3.5 fill-red-500" />
                <span className="text-[10px] font-medium">Not helpful</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
