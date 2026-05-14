'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
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
  { label: string; className: string }
> = {
  K: {
    label: 'Knowledge',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  },
  C: {
    label: 'Cognitive',
    className:
      'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
  },
  P: {
    label: 'Personality',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  },
  B: {
    label: 'Behavioral',
    className:
      'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  },
  S: {
    label: 'Simulation',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  },
  A: {
    label: 'Ability',
    className:
      'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
  },
  E: {
    label: 'Emotional Intelligence',
    className:
      'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
  },
  D: {
    label: 'Development',
    className:
      'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  },
};

function TestTypeBadge({ type }: { type: string }) {
  // Handle comma-separated test types (e.g., "C,P,B")
  const types = type
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => {
        const config = TEST_TYPE_CONFIG[t] ?? {
          label: t,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
        return (
          <Badge
            key={t}
            variant="outline"
            className={`text-[10px] font-semibold transition-colors ${config.className}`}
          >
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Card className="group relative w-full overflow-hidden border transition-all duration-300 hover:shadow-md hover:border-emerald-300 hover:ring-1 hover:ring-emerald-200/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-snug text-foreground">
              {recommendation.name}
            </CardTitle>
          </div>
          <TestTypeBadge type={recommendation.test_type} />
        </CardHeader>
        <CardContent className="pb-2 pt-0" />
        <CardFooter className="pt-0">
          <a
            href={recommendation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-900 hover:underline"
            aria-label={`View details for ${recommendation.name}`}
          >
            View Details
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
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
