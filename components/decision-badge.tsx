import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TriageResult } from '@/lib/schema';

export type Decision = TriageResult['decision'];

const DECISION_STYLES: Record<
  Decision,
  { bg: string; fg: string; label: string }
> = {
  EMBOLIZATION: { bg: '#FDEBEC', fg: '#9F2F2D', label: 'Embolization' },
  SURGERY: { bg: '#E1F3FE', fg: '#1F6C9F', label: 'Surgery' },
  CONSERVATIVE: { bg: '#EDF3EC', fg: '#346538', label: 'Conservative' },
  IMAGING_FIRST: { bg: '#FBF3DB', fg: '#956400', label: 'Imaging first' },
};

interface DecisionBadgeProps {
  decision: Decision | undefined;
  className?: string;
}

export function DecisionBadge({ decision, className }: DecisionBadgeProps) {
  if (!decision) {
    return (
      <span
        className={cn(
          'inline-flex h-5 items-center rounded-full border border-[#EEEDEC] px-2 text-xs tracking-wide text-[#67625B]',
          className,
        )}
      >
        —
      </span>
    );
  }

  const style = DECISION_STYLES[decision];

  return (
    <Badge
      className={cn(
        'h-5 rounded-full border-transparent px-2 text-[10px] font-semibold tracking-widest uppercase',
        className,
      )}
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {style.label}
    </Badge>
  );
}