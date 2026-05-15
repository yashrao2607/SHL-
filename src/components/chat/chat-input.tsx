'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_CHARS = 2000;

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
        {/* Input container with animated border */}
        <div
          className={`relative flex items-end gap-2 rounded-xl border bg-muted/30 transition-all duration-300 ${
            isFocused
              ? 'border-emerald-400/60 ring-2 ring-emerald-400/20 shadow-sm shadow-emerald-500/10'
              : 'border-border/60 hover:border-muted-foreground/30'
          }`}
        >
          {/* Paperclip icon (decorative) */}
          <div className="flex items-end pb-2.5 pl-3">
            <Paperclip
              className="h-4 w-4 text-muted-foreground/40 transition-colors hover:text-muted-foreground/70 cursor-default"
              aria-hidden="true"
            />
          </div>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Describe the role or assessment you need..."
            disabled={isLoading}
            rows={1}
            className="min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:border-0 placeholder:text-muted-foreground/50"
            aria-label="Type your message"
            maxLength={MAX_CHARS + 100}
          />

          {/* Send button with gradient */}
          <div className="flex items-end pb-2 pr-2">
            <Button
              onClick={handleSend}
              disabled={!canSend || isOverLimit}
              size="icon"
              className={`h-9 w-9 shrink-0 rounded-lg shadow-sm transition-all duration-300 ${
                canSend
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30'
                  : 'bg-muted text-muted-foreground/40 shadow-none'
              }`}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
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
                    : 'text-muted-foreground/40'
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
