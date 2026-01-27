import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { DailyQuest } from "@shared/schema";

interface QuestCardProps {
  quest: DailyQuest;
}

export function QuestCard({ quest }: QuestCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 rounded-lg border flex items-center gap-4 transition-all duration-300",
        quest.completed 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      <div className="shrink-0">
        {quest.completed ? (
          <CheckCircle2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
        ) : (
          <Circle className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      <div className="grow">
        <h4 className={cn(
          "font-semibold text-lg font-display",
          quest.completed && "text-muted-foreground line-through decoration-primary/50"
        )}>
          {quest.title}
        </h4>
        {quest.description && (
          <p className="text-sm text-muted-foreground">{quest.description}</p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            "text-[10px] uppercase px-2 py-0.5 rounded font-bold border",
            quest.questType === 'fitness' && "bg-red-500/10 text-red-400 border-red-500/20",
            quest.questType === 'business' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
            quest.questType === 'learning' && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
            quest.questType === 'location' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            quest.questType === 'mandatory' && "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          )}>
            {quest.questType}
          </span>
          
          <div className="flex items-center gap-1 text-xs text-primary font-mono font-medium">
            <Trophy className="w-3 h-3" />
            <span>+{quest.xpReward} XP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
