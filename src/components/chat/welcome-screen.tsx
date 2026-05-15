'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Search,
  GitCompareArrows,
  UserCheck,
  Layers,
  Code2,
  Brain,
  Users,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'Find Assessments',
    description: 'Search 150+ SHL assessments by role, skills, or test type',
    color: 'from-emerald-400 to-teal-500',
    bgGlow: 'bg-emerald-500/10',
  },
  {
    icon: GitCompareArrows,
    title: 'Compare Options',
    description: 'Side-by-side comparison of similar assessments',
    color: 'from-teal-400 to-cyan-500',
    bgGlow: 'bg-teal-500/10',
  },
  {
    icon: UserCheck,
    title: 'Personalized Picks',
    description: 'Tailored recommendations based on your hiring needs',
    color: 'from-cyan-400 to-sky-500',
    bgGlow: 'bg-cyan-500/10',
  },
  {
    icon: Layers,
    title: 'Multiple Test Types',
    description: 'Cognitive, behavioral, personality & more',
    color: 'from-sky-400 to-blue-500',
    bgGlow: 'bg-sky-500/10',
  },
];

const SUGGESTION_CATEGORIES = [
  {
    icon: Code2,
    label: 'Technical',
    suggestion: 'I need assessments for a Java developer role',
  },
  {
    icon: Brain,
    label: 'Cognitive',
    suggestion: 'Looking for cognitive ability tests for senior roles',
  },
  {
    icon: Users,
    label: 'Leadership',
    suggestion: 'Need personality assessments for leadership positions',
  },
  {
    icon: GitCompareArrows,
    label: 'Compare',
    suggestion: 'Compare OPQ and Verify assessments',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 overflow-auto">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 h-60 w-60 rounded-full bg-teal-400/8 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-cyan-400/6 blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-2xl w-full"
      >
        {/* Hero section */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/25"
          >
            <Sparkles className="h-8 w-8 text-white" aria-hidden="true" />
          </motion.div>

          {/* Title */}
          <motion.h2
            variants={itemVariants}
            className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Welcome to SHL Assessment Advisor
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-sm text-muted-foreground sm:text-base max-w-md mx-auto leading-relaxed"
          >
            I&apos;ll help you find the perfect SHL assessments for your hiring needs.
            Tell me about the role you&apos;re hiring for, or try one of the suggestions below.
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group relative rounded-xl border bg-card/50 backdrop-blur-sm p-3.5 overflow-hidden"
            >
              {/* Glow effect on hover */}
              <div
                className={`absolute inset-0 ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative">
                <div
                  className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} shadow-sm`}
                >
                  <feature.icon className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xs font-semibold text-foreground mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Suggestion chips with categories */}
        <motion.div variants={itemVariants} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-wider">
            Try asking
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTION_CATEGORIES.map((item, index) => (
              <motion.div
                key={item.suggestion}
                variants={itemVariants}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2.5 px-3.5 border-muted-foreground/15 hover:border-emerald-400/50 hover:bg-emerald-50/50 hover:text-emerald-800 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 transition-all duration-200 group"
                  onClick={() => onSuggestionClick(item.suggestion)}
                  aria-label={`Send: ${item.suggestion}`}
                >
                  <span className="mr-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/40 transition-colors">
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                    <span className="text-sm font-normal text-foreground/90">
                      {item.suggestion}
                    </span>
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
