type Quest = {
  id: number;
  title: string;
  description?: string;
  quest_type: string;
  completed: boolean;
};

export function QuestList({
  quests,
  onToggle,
  compact = false,
}: {
  quests: Quest[];
  onToggle?: (questId: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {quests.map((q) => (
        <div
          key={q.id}
          className={`p-4 rounded-lg border ${
            q.completed
              ? "bg-emerald-950/30 border-emerald-800"
              : "bg-zinc-800/40 border-zinc-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{q.title}</span>
                <QuestTypeBadge type={q.quest_type} />
              </div>
              {!compact && q.description && (
                <p className="text-sm text-zinc-400 mt-1">{q.description}</p>
              )}
            </div>
            {onToggle ? (
              <button
                onClick={() => onToggle(q.id)}
                className={`ml-4 px-3 py-1 rounded text-sm ${
                  q.completed
                    ? "bg-zinc-700 hover:bg-zinc-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {q.completed ? "Undo" : "Complete"}
              </button>
            ) : (
              q.completed && <span className="text-emerald-400 text-xl">✓</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    mandatory: "bg-red-900/40 text-red-300 border-red-800",
    fitness: "bg-orange-900/40 text-orange-300 border-orange-800",
    business: "bg-blue-900/40 text-blue-300 border-blue-800",
    learning: "bg-purple-900/40 text-purple-300 border-purple-800",
    location: "bg-green-900/40 text-green-300 border-green-800",
  };

  const color = colors[type] || "bg-zinc-800 text-zinc-400 border-zinc-700";

  return (
    <span className={`text-xs px-2 py-1 rounded border ${color}`}>
      {type}
    </span>
  );
}

