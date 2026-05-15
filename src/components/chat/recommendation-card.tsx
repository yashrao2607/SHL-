'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Clock,
  Monitor,
  Zap,
  Tag,
  Hash,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Recommendation } from '@/lib/chat-store';

const TEST_TYPE_CONFIG: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  K: {
    label: 'Knowledge',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  C: {
    label: 'Cognitive',
    className:
      'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
    dotColor: 'bg-sky-500',
  },
  P: {
    label: 'Personality',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
    dotColor: 'bg-purple-500',
  },
  B: {
    label: 'Behavioral',
    className:
      'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
    dotColor: 'bg-green-500',
  },
  S: {
    label: 'Simulation',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  A: {
    label: 'Ability',
    className:
      'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
  E: {
    label: 'Emotional Intelligence',
    className:
      'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800',
    dotColor: 'bg-pink-500',
  },
  D: {
    label: 'Development',
    className:
      'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
    dotColor: 'bg-gray-500',
  },
};

function TestTypeBadge({ type }: { type: string }) {
  const types = type
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => {
        const config = TEST_TYPE_CONFIG[t] ?? {
          label: t,
          className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
          dotColor: 'bg-gray-500',
        };
        return (
          <Badge
            key={t}
            variant="outline"
            className={`text-[10px] font-semibold transition-colors flex items-center gap-1 ${config.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

export function RecommendationCard({
  recommendation,
  index,
}: RecommendationCardProps) {
  const [isCompare, setIsCompare] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Card className="group relative w-full overflow-hidden border transition-all duration-300 hover:shadow-lg hover:border-emerald-300/60 hover:ring-1 hover:ring-emerald-200/40 dark:hover:border-emerald-700/60 dark:hover:ring-emerald-800/40">
        {/* Gradient border top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rank indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow-sm">
            {index + 1}
          </span>
        </div>

        <CardHeader className="pb-2 pr-10">
          <CardTitle className="text-sm font-semibold leading-snug text-foreground pr-2">
            {recommendation.name}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <TestTypeBadge type={recommendation.test_type} />
          </div>
        </CardHeader>

        <CardContent className="pb-2 pt-0">
          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {recommendation.duration && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 text-emerald-500" />
                <span>{recommendation.duration}</span>
              </div>
            )}
            {recommendation.remote_testing && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium gap-1 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-800"
              >
                <Monitor className="h-2.5 w-2.5" />
                Remote
              </Badge>
            )}
            {recommendation.adaptive && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
              >
                <Zap className="h-2.5 w-2.5" />
                Adaptive
              </Badge>
            )}
            {recommendation.category && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium gap-1 bg-muted text-muted-foreground border-border"
              >
                <Tag className="h-2.5 w-2.5" />
                {recommendation.category}
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-3 flex items-center justify-between">
          <a
            href={recommendation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-colors hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline underline-offset-2"
            aria-label={`View details for ${recommendation.name}`}
          >
            View Details
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>

          {/* Compare checkbox */}
          <button
            onClick={() => setIsCompare(!isCompare)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label={isCompare ? 'Remove from comparison' : 'Add to comparison'}
          >
            {isCompare ? (
              <CheckSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            Compare
          </button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {recommendations.map((rec, i) => (
        <RecommendationCard key={`${rec.name}-${i}`} recommendation={rec} index={i} />
      ))}
    </div>
  );
}
