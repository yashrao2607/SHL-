'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_CHARS = 2000;

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = input.trim().length > 0 && !isLoading;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(input.trim());
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, input, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const charCount = input.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="border-t bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the role or assessment you need..."
              disabled={isLoading}
              rows={1}
              className="min-h-[44px] max-h-[160px] resize-none rounded-xl border-muted-foreground/20 bg-muted/50 pr-2 text-sm focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30 placeholder:text-muted-foreground/60"
              aria-label="Type your message"
              maxLength={MAX_CHARS + 100}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!canSend || isOverLimit}
            size="icon"
            className="h-[44px] w-[44px] shrink-0 rounded-xl bg-emerald-600 shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md disabled:opacity-40 disabled:shadow-none"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {/* Character limit indicator */}
        {charCount > 0 && (
          <div className="mt-1.5 flex justify-end">
            <span
              className={`text-[11px] transition-colors ${
                isOverLimit
                  ? 'text-destructive font-medium'
                  : isNearLimit
                    ? 'text-amber-600'
                    : 'text-muted-foreground/50'
              }`}
            >
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
