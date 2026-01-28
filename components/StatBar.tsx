export function StatBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-sm font-semibold text-zinc-100">{value}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

