'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  TrendingUp,
  Code2,
  Heart,
  Target,
  ShieldCheck,
  X,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ConversationContext } from '@/lib/chat-store';

interface ContextSidebarProps {
  context: ConversationContext;
  isOpen: boolean;
  onClose: () => void;
}

function ContextField({
  icon: Icon,
  label,
  value,
  isTag = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | string[];
  isTag?: boolean;
}) {
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {isEmpty ? (
        <p className="text-xs text-muted-foreground/50 italic">Not specified</p>
      ) : isTag && Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1">
          <AnimatePresence mode="popLayout">
            {value.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                >
                  {item}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.p
          key={typeof value === 'string' ? value : value.join(',')}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-foreground"
        >
          {typeof value === 'string' ? value : value.join(', ')}
        </motion.p>
      )}
    </div>
  );
}

export function ContextSidebar({ context, isOpen, onClose }: ContextSidebarProps) {
  const hasAnyContext =
    context.role ||
    context.seniority ||
    context.technical_skills.length > 0 ||
    context.behavioral_requirements.length > 0 ||
    context.assessment_preferences.length > 0 ||
    context.must_have_constraints.length > 0 ||
    context.excluded_constraints.length > 0;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l bg-background/95 backdrop-blur-md shadow-xl lg:relative lg:z-0 lg:shadow-none lg:border-l"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-foreground">
                  Conversation Context
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                aria-label="Close context sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {!hasAnyContext ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation to see extracted context
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      I&apos;ll extract role, skills, and preferences as we chat
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <ContextField
                      icon={Briefcase}
                      label="Role"
                      value={context.role}
                    />
                    <Separator />
                    <ContextField
                      icon={TrendingUp}
                      label="Seniority"
                      value={context.seniority}
                    />
                    <Separator />
                    <ContextField
                      icon={Code2}
                      label="Technical Skills"
                      value={context.technical_skills}
                      isTag
                    />
                    <Separator />
                    <ContextField
                      icon={Heart}
                      label="Behavioral Requirements"
                      value={context.behavioral_requirements}
                      isTag
                    />
                    <Separator />
                    <ContextField
                      icon={Target}
                      label="Assessment Preferences"
                      value={context.assessment_preferences}
                      isTag
                    />
                    <Separator />
                    <ContextField
                      icon={ShieldCheck}
                      label="Constraints"
                      value={[...context.must_have_constraints, ...context.excluded_constraints.map(e => `Excl: ${e}`)]}
                      isTag
                    />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t px-4 py-3">
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Auto-extracted from your conversation
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
