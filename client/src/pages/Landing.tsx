import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-primary font-mono animate-pulse">INITIALIZING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-primary/30">
      {/* Hero Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-30" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full opacity-20" />
      </div>

      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold font-display tracking-widest">SOLO AGENT</h1>
        <a href="/api/login" className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-sm font-medium">
          System Login
        </a>
      </nav>

      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-wider"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          SYSTEM ONLINE: HOUSTON COHORT
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black font-display tracking-tight mb-8 leading-[0.9]"
        >
          RISE FROM <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500">E-RANK</span> TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500 glitch-text">S-RANK</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed"
        >
          The only gamified growth system for elite real estate agents. Track your stats, complete daily quests, and dominate your market zone.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
        >
          <a href="/api/login" className="flex-1 px-8 py-4 bg-primary text-white rounded-xl font-bold tracking-wide shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group">
            ACCEPT QUEST
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full max-w-5xl"
        >
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm hover:border-primary/50 transition-colors group">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Stat Tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Visualize your growth across Strength (Health), Intelligence (Market Knowledge), and Charisma (Networking).
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm hover:border-blue-500/50 transition-colors group">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
              <ShieldCheck className="w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Zone Defense</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Check in at key locations in your farm area. Claim territory and maintain dominance in your neighborhood.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm hover:border-purple-500/50 transition-colors group">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
              <Target className="w-6 h-6 text-zinc-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Daily Quests</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Receive mandatory missions daily. Complete them to maintain your streak and earn XP rewards.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
