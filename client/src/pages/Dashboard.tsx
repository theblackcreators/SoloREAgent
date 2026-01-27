import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/StatCard";
import { QuestCard } from "@/components/QuestCard";
import { 
  Dumbbell, Brain, MessageSquare, Briefcase, 
  MapPin, Crown, Zap, Flame, Coins 
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useDashboard(); // Default cohort

  // Redirect to join if user has no cohort stats yet (and it's not just loading)
  // In a real app, backend would return a specific "NotEnrolled" error code
  useEffect(() => {
    if (!isLoading && error) {
      // Assuming 404/Error means not in a cohort
      // setLocation("/join");
    }
  }, [isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse tracking-widest">LOADING SYSTEM HUD...</div>
      </div>
    );
  }

  // If we have no data, show empty state or redirect (handled above)
  if (!data) return null;

  const { stats, quests } = data;

  // Calculate Level progress (Arbitrary logic: Level = XP / 1000)
  const level = Math.floor(stats.xp / 1000) + 1;
  const xpInLevel = stats.xp % 1000;
  const xpProgress = (xpInLevel / 1000) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pl-64">
      <Navigation />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
        
        {/* Header HUD */}
        <header className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-2 border-primary overflow-hidden relative shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-zinc-800">
                  {user?.firstName?.[0]}
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-center text-[10px] font-mono py-1 backdrop-blur-sm">
                LVL {level}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-display font-bold uppercase">{user?.firstName} {user?.lastName}</h2>
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                  <Crown className="w-3 h-3" />
                  RANK {stats.rank}
                </div>
              </div>
              <p className="text-zinc-400 font-mono text-sm">CLASS: {stats.rank === 'S' ? 'MONARCH' : 'AGENT'}</p>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-orange-400 font-mono text-xs">
                  <Flame className="w-4 h-4" />
                  STREAK: {stats.streak} DAYS
                </div>
                <div className="flex items-center gap-1.5 text-yellow-400 font-mono text-xs">
                  <Coins className="w-4 h-4" />
                  GOLD: {stats.gold}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-96 space-y-2">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>XP {xpInLevel} / 1000</span>
              <span>{Math.round(xpProgress)}%</span>
            </div>
            <div className="h-3 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-blue-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]"
              />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-zinc-500 font-mono text-xs uppercase tracking-widest">
            <Zap className="w-4 h-4" />
            Character Stats
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard label="STR" value={stats.str} icon={Dumbbell} colorClass="text-red-400" delay={0} />
            <StatCard label="INT" value={stats.int} icon={Brain} colorClass="text-blue-400" delay={1} />
            <StatCard label="CHA" value={stats.cha} icon={MessageSquare} colorClass="text-pink-400" delay={2} />
            <StatCard label="STA" value={stats.sta} icon={Zap} colorClass="text-green-400" delay={3} />
            <StatCard label="AGI" value={stats.agi} icon={Zap} colorClass="text-yellow-400" delay={4} />
            <StatCard label="REP" value={stats.rep} icon={Crown} colorClass="text-purple-400" delay={5} />
            <StatCard label="BIZ" value={Math.floor(stats.xp / 100)} icon={Briefcase} colorClass="text-zinc-200" delay={6} />
          </div>
        </section>

        {/* Quests */}
        <section className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase tracking-widest">
                <Briefcase className="w-4 h-4" />
                Active Quests
              </div>
              <span className="text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-400 border border-zinc-800">
                {quests.filter(q => q.completed).length}/{quests.length} COMPLETED
              </span>
            </div>
            
            <div className="space-y-3">
              {quests.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                  NO ACTIVE QUESTS
                </div>
              ) : (
                quests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </div>

          {/* Mini Map Preview or Zone Status */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className="w-8 h-8 text-zinc-700 mb-4" />
            <h3 className="text-lg font-bold font-display mb-2">ZONE STATUS</h3>
            <p className="text-sm text-zinc-400 mb-6">
              You are currently in <span className="text-white font-medium">Safe Zone</span>. Check in to field locations to claim territory.
            </p>
            <Link href="/map" className="inline-flex items-center justify-center w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg transition-colors border border-zinc-700">
              OPEN WORLD MAP
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
