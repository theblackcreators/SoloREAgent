import { Link, useLocation } from "wouter";
import { LayoutDashboard, Map, ClipboardList, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "HUD" },
    { href: "/today", icon: ClipboardList, label: "Log" },
    { href: "/map", icon: Map, label: "Map" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-zinc-950 border-r border-zinc-800 p-6 z-50">
        <div className="mb-10">
          <h1 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            Solo Agent
          </h1>
          <p className="text-xs text-muted-foreground mt-1">System Version 1.0</p>
        </div>

        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-zinc-900"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <button 
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 p-4 z-50 flex justify-around items-center pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button 
          onClick={() => logout()}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </nav>
    </>
  );
}
