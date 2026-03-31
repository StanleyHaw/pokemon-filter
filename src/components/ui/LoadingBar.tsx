interface LoadingBarProps {
  loaded: number;
  total: number;
  state: string;
}

export function LoadingBar({ loaded, total, state }: LoadingBarProps) {
  if (state === "complete") return null;

  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-0.5 bg-surface-border">
        <div
          className="h-full bg-accent-blue transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {state === "loading" && (
        <div className="absolute right-4 top-2 text-xs text-gray-400">
          載入中 {loaded} / {total}
        </div>
      )}
    </div>
  );
}
