import { useState } from "react";
import { useJoinCohort } from "@/hooks/use-dashboard";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Join() {
  const [code, setCode] = useState("");
  const { mutate, isPending } = useJoinCohort();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(code, {
      onSuccess: () => {
        toast({
          title: "Access Granted",
          description: "Welcome to the system.",
          className: "bg-green-900 border-green-800 text-white",
        });
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({
          title: "Access Denied",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-display text-white tracking-widest">SYSTEM ACCESS</h1>
          <p className="text-zinc-500 font-mono text-sm">ENTER INVITE CODE TO INITIALIZE</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-lg blur opacity-25 group-focus-within:opacity-75 transition duration-500"></div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="INVITE-CODE-HERE"
              className="relative w-full bg-zinc-900 text-white placeholder:text-zinc-600 border border-zinc-800 rounded-lg px-4 py-4 text-center font-mono text-lg tracking-widest focus:outline-none focus:bg-zinc-900/90 transition-colors uppercase"
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            disabled={!code || isPending}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg tracking-wide shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                VERIFYING...
              </>
            ) : (
              "INITIALIZE"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-700 font-mono">
          UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED
        </p>
      </div>
    </div>
  );
}
