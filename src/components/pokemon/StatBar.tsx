import { StatKey } from "../../types/pokemon";
import { STAT_CSS_CLASS } from "../../constants/stats";

interface StatBarProps {
  statKey: StatKey;
  value: number;
  max?: number;
}

export function StatBar({ statKey, value, max = statKey === "total" ? 800 : 255 }: StatBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-xs font-mono w-7 text-right text-gray-300 shrink-0">{value}</span>
      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${STAT_CSS_CLASS[statKey]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
