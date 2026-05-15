'use client';

import { useCallback, useState } from 'react';
import { RotateCcw, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { WelcomeScreen } from '@/components/chat/welcome-screen';
import { ContextSidebar } from '@/components/chat/context-sidebar';
import { useChatStore } from '@/lib/chat-store';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const { messages, isLoading, sendMessage, clearChat, context, setFeedback } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const handleFeedback = useCallback(
    (messageId: string, feedback: 'positive' | 'negative') => {
      setFeedback(messageId, feedback);
    },
    [setFeedback]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="relative z-10 border-b bg-background/80 backdrop-blur-md shadow-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20 overflow-hidden">
                <img src="/shl-logo.png" alt="SHL" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                  SHL Assessment Recommender
                </h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Find the right SHL assessments for your hiring needs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`h-8 w-8 transition-colors ${
                  isSidebarOpen
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={isSidebarOpen ? 'Close context panel' : 'Open context panel'}
              >
                {isSidebarOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="gap-1.5 text-muted-foreground transition-colors hover:text-foreground h-8"
                aria-label="Start a new chat"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            </div>
          </div>
          {/* Accent gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
        </header>

        {/* Chat area */}
        <main className="flex min-h-0 flex-1 flex-col">
          {hasMessages ? (
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onFeedback={handleFeedback}
            />
          ) : (
            <WelcomeScreen onSuggestionClick={handleSend} />
          )}
        </main>

        {/* Footer / Input */}
        <footer className="mt-auto">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </footer>
      </div>

      {/* Context Sidebar */}
      <ContextSidebar
        context={context}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}
