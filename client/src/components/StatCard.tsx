import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass?: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, colorClass = "text-primary", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className="bg-card border border-border/50 p-4 rounded-xl relative overflow-hidden group hover:border-primary/50 transition-colors duration-300"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16 text-white" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("w-5 h-5", colorClass)} />
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold font-mono", colorClass)}>{value}</span>
          <span className="text-xs text-muted-foreground">LVL</span>
        </div>
        
        {/* Mini progress bar for visual flair */}
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(value * 2, 100)}%` }}
            transition={{ duration: 1, delay: 0.5 + (delay * 0.1) }}
            className={cn("h-full rounded-full opacity-70", colorClass.replace("text-", "bg-"))}
          />
        </div>
      </div>
    </motion.div>
  );
}
