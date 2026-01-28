export function HudCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
        {value}
      </div>
      {sub ? <div className="mt-2 text-sm text-zinc-300">{sub}</div> : null}
    </div>
  );
}

