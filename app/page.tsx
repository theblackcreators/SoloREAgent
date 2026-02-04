"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Target,
  TrendingUp,
  CheckCircle2,
  Users,
  Zap,
  Trophy,
  Star,
  ChevronDown,
  Flame,
  Clock
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_hero", leadMagnet: "ranking_assessment" }),
      });
      if (res.ok) {
        setSubmitStatus("success");
        setTimeout(() => router.push(`/signup?email=${encodeURIComponent(email)}`), 1500);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-purple-500 font-mono animate-pulse">
        INITIALIZING SYSTEM...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-purple-500/30">
      {/* Hero Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full opacity-30" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full opacity-20" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-widest">SOLO AGENT</h1>
        <div className="flex items-center gap-4">
          <Link href="#how-it-works" className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors">
            How It Works
          </Link>
          <Link
            href="/login"
            className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-sm font-medium"
          >
            System Login
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-12 md:pt-20 pb-16 flex flex-col items-center text-center">
          {/* Social Proof Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono tracking-wider"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>500+ AGENTS LEVELING UP</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[0.9]"
          >
            RISE FROM <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500">E-RANK</span> TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500">S-RANK</span>
          </motion.h1>

          {/* Benefit-Driven Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-8 leading-relaxed"
          >
            <span className="text-white font-semibold">Close more deals. Build real wealth.</span> The gamified system that turns daily habits into elite performance. Track stats, complete quests, dominate your market.
          </motion.p>

          {/* Lead Capture Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-md mb-6"
          >
            {submitStatus === "success" ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>You&apos;re in! Redirecting to create your account...</span>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to start"
                  className="flex-1 px-5 py-4 bg-zinc-900/80 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-purple-500 hover:bg-purple-400 disabled:bg-purple-500/50 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group whitespace-nowrap"
                >
                  {isSubmitting ? "JOINING..." : "START FREE"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}
            {submitStatus === "error" && (
              <p className="mt-2 text-red-400 text-sm">Something went wrong. Please try again.</p>
            )}
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 mb-8"
          >
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Free 7-day trial</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cancel anytime</span>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              See how it works
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </Link>
          </motion.div>
        </section>

        {/* Social Proof Stats */}
        <section className="container mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            <StatCard icon={<Users className="w-6 h-6" />} value="500+" label="Active Agents" />
            <StatCard icon={<Zap className="w-6 h-6" />} value="2.4M" label="XP Earned" />
            <StatCard icon={<Target className="w-6 h-6" />} value="15K+" label="Quests Completed" />
            <StatCard icon={<Trophy className="w-6 h-6" />} value="47" label="S-Rank Agents" />
          </motion.div>
        </section>

        {/* Problem/Solution Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Problem */}
              <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">😤</span> The E-Rank Struggle
                </h3>
                <ul className="space-y-3 text-zinc-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    Inconsistent daily habits killing your momentum
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    No system to track what actually moves the needle
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    Feeling stuck while others close deals
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    No accountability or community support
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="p-8 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏆</span> The S-Rank System
                </h3>
                <ul className="space-y-3 text-zinc-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">✓</span>
                    Daily quests that build unstoppable habits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">✓</span>
                    XP & stats that show your real progress
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">✓</span>
                    Rank system that motivates you to level up
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">✓</span>
                    Cohort of elite agents pushing each other
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Level Up in 3 Steps</h2>
            <p className="text-zinc-400">Simple system. Massive results.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="01"
              title="Join Your Cohort"
              description="Sign up and get placed with elite agents in your market. Your journey from E-Rank begins."
              icon={<Users className="w-8 h-8" />}
            />
            <StepCard
              number="02"
              title="Complete Daily Quests"
              description="MOVE, TRAIN, HUNT, LEARN. Four daily missions that build the habits of top producers."
              icon={<Target className="w-8 h-8" />}
            />
            <StepCard
              number="03"
              title="Rise Through Ranks"
              description="Earn XP, level up your stats, and climb from E-Rank to the elite S-Rank status."
              icon={<Trophy className="w-8 h-8" />}
            />
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Stat Tracking"
              description="Visualize growth across STR, STA, AGI, INT, CHA, and REP. See exactly where you're improving."
              color="purple"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Zone Defense"
              description="Check in at key locations. Claim territory and maintain dominance in your farm area."
              color="blue"
            />
            <FeatureCard
              icon={<Flame className="w-6 h-6" />}
              title="Streak System"
              description="Build momentum with daily streaks. Miss a day? Your streak resets. Stay consistent to level up fast."
              color="orange"
            />
          </motion.div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Agents Are Saying</h2>
            <p className="text-zinc-400">Real results from real agents</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <TestimonialCard
              quote="Went from 2 deals/month to 5 in my first 90 days. The daily quest system completely changed my habits."
              name="Marcus T."
              role="A-Rank Agent"
              rank="A"
            />
            <TestimonialCard
              quote="Finally have a system that keeps me accountable. The gamification makes prospecting actually fun."
              name="Sarah K."
              role="B-Rank Agent"
              rank="B"
            />
            <TestimonialCard
              quote="Hit S-Rank in 6 months. The cohort competition pushed me harder than any brokerage ever did."
              name="James R."
              role="S-Rank Agent"
              rank="S"
            />
          </div>
        </section>

        {/* Urgency Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-mono mb-4">
              <Clock className="w-4 h-4" />
              LIMITED AVAILABILITY
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Houston Cohort: Only 12 Spots Left</h3>
            <p className="text-zinc-400 mb-6">
              We keep cohorts small for maximum accountability. The next cohort starts February 1st.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all group"
            >
              CLAIM YOUR SPOT
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Rise?</h2>
            <p className="text-zinc-400 mb-8">
              Join 500+ agents who are leveling up their careers. Your journey to S-Rank starts now.
            </p>
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-5 py-4 bg-zinc-900/80 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-purple-500 hover:bg-purple-400 disabled:bg-purple-500/50 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
              >
                JOIN NOW
              </button>
            </form>
            <p className="text-xs text-zinc-500">
              🔒 We respect your privacy. Unsubscribe anytime.
            </p>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} Solo Agent. Level up your real estate game.
              </p>
              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <Link href="/login" className="hover:text-zinc-300 transition-colors">Login</Link>
                <Link href="/join" className="hover:text-zinc-300 transition-colors">Have an invite?</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Component: Stat Card
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 text-purple-400 mb-3">
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  );
}

// Component: Step Card
function StepCard({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center"
    >
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 rounded-full text-xs font-bold">
        STEP {number}
      </div>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-zinc-800 text-purple-400 mb-4 mt-2">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </motion.div>
  );
}

// Component: Feature Card
function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: "purple" | "blue" | "orange" }) {
  const colorClasses = {
    purple: "hover:border-purple-500/50 group-hover:bg-purple-500/20 group-hover:text-purple-500",
    blue: "hover:border-blue-500/50 group-hover:bg-blue-500/20 group-hover:text-blue-500",
    orange: "hover:border-orange-500/50 group-hover:bg-orange-500/20 group-hover:text-orange-500",
  };

  return (
    <div className={`p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm ${colorClasses[color].split(" ")[0]} transition-colors group`}>
      <div className={`w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 text-zinc-400 transition-colors ${colorClasses[color].split(" ").slice(1).join(" ")}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Component: Testimonial Card
function TestimonialCard({ quote, name, role, rank }: { quote: string; name: string; role: string; rank: string }) {
  const rankColors: Record<string, string> = {
    S: "from-yellow-500 to-orange-500 text-yellow-900",
    A: "from-purple-500 to-blue-500 text-white",
    B: "from-blue-500 to-cyan-500 text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
    >
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
        ))}
      </div>
      <p className="text-zinc-300 text-sm mb-6 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${rankColors[rank]} flex items-center justify-center font-bold text-sm`}>
          {rank}
        </div>
        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs text-zinc-500">{role}</div>
        </div>
      </div>
    </motion.div>
  );
}

