'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TypingIndicator } from './typing-indicator';
import { RecommendationList } from './recommendation-card';
import { FeedbackButtons } from './feedback-buttons';
import type { Message } from '@/lib/chat-store';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted/80 transition-all"
      aria-label={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function MessageBubble({
  message,
  index,
  onFeedback,
}: {
  message: Message;
  index: number;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.15), ease: 'easeOut' }}
      className={`flex items-start gap-3 px-4 py-2 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      role="listitem"
      aria-label={`${isUser ? 'You' : 'Assistant'}: ${message.content.slice(0, 80)}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
            : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/40 dark:text-emerald-400'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-[70%] ${
          isUser ? 'items-end' : 'items-start'
        } flex flex-col`}
      >
        <div className="relative group">
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'rounded-tr-sm bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'rounded-tl-sm bg-muted/80 backdrop-blur-sm text-foreground border border-border/50'
            }`}
          >
            {isUser ? (
              // Simple rendering for user messages
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              // Rich markdown rendering for assistant messages
              <div className="prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-2.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_a]:text-emerald-600 [&_a]:underline dark:[&_a]:text-emerald-400">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Actions (copy + timestamp) for assistant messages */}
          {!isUser && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={message.content} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/50 mt-0.5 px-1">
          {formatRelativeTime(message.timestamp)}
        </span>

        {/* Feedback buttons for assistant messages */}
        {!isUser && (
          <FeedbackButtons
            messageId={message.id}
            currentFeedback={message.feedback ?? null}
            onFeedback={onFeedback}
          />
        )}

        {/* Recommendations */}
        {!isUser && message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-2 w-full">
            <RecommendationList recommendations={message.recommendations} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

export function ChatMessages({ messages, isLoading, onFeedback }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-smooth"
      role="list"
      aria-label="Chat messages"
      style={{
        scrollbarGutter: 'stable',
      }}
    >
      <div className="mx-auto max-w-3xl py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              index={index}
              onFeedback={onFeedback}
            />
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <TypingIndicator />
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" aria-hidden="true" />
      </div>
    </div>
  );
}
