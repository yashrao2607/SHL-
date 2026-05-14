'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { TypingIndicator } from './typing-indicator';
import { RecommendationList } from './recommendation-card';
import type { Message } from '@/lib/chat-store';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

function MessageBubble({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.02, ease: 'easeOut' }}
      className={`flex items-start gap-3 px-4 py-2 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      role="listitem"
      aria-label={`${isUser ? 'You' : 'Assistant'}: ${message.content.slice(0, 80)}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-100 text-emerald-700'
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
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm bg-emerald-600 text-white'
              : 'rounded-tl-sm bg-muted text-foreground'
          }`}
        >
          {/* Render content with basic markdown-like formatting */}
          {message.content.split('\n').map((line, i) => {
            // Bold text
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={j}>{part.slice(2, -2)}</strong>
                    );
                  }
                  // Handle list items
                  if (part.startsWith('- ') || part.startsWith('• ')) {
                    return (
                      <span key={j}>
                        <br />• {part.slice(2)}
                      </span>
                    );
                  }
                  return <span key={j}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>

        {/* Recommendations */}
        {!isUser && message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-1 w-full">
            <RecommendationList recommendations={message.recommendations} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
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
