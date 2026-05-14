'use client';

import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { WelcomeScreen } from '@/components/chat/welcome-screen';
import { useChatStore } from '@/lib/chat-store';
import { toast } from 'sonner';

export default function Home() {
  const { messages, isLoading, sendMessage, clearChat } = useChatStore();

  const handleSend = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content);
      } catch {
        toast.error('Failed to get a response. Please try again.', {
          position: 'top-center',
          duration: 4000,
        });
      }
    },
    [sendMessage]
  );

  const handleNewChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="relative z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm overflow-hidden">
              <img src="/shl-logo.png" alt="SHL" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground sm:text-base">
                SHL Assessment Recommender
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Find the right SHL assessments for your hiring needs
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Start a new chat"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
        {/* Accent gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      </header>

      {/* Chat area */}
      <main className="flex min-h-0 flex-1 flex-col">
        {hasMessages ? (
          <ChatMessages messages={messages} isLoading={isLoading} />
        ) : (
          <WelcomeScreen onSuggestionClick={handleSend} />
        )}
      </main>

      {/* Footer / Input */}
      <footer className="mt-auto">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </footer>
    </div>
  );
}
