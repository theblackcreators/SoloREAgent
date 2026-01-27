import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLogSchema } from "@shared/schema";
import { useCreateLog } from "@/hooks/use-dashboard";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { z } from "zod";
import { useLocation } from "wouter";

// Extend the schema to handle form string inputs that need coercion
const formSchema = insertLogSchema.extend({
  steps: z.coerce.number().min(0),
  learningMinutes: z.coerce.number().min(0),
  calls: z.coerce.number().min(0),
  texts: z.coerce.number().min(0),
  convos: z.coerce.number().min(0),
  leads: z.coerce.number().min(0),
  appts: z.coerce.number().min(0),
});

export default function LogActivity() {
  const { mutate, isPending } = useCreateLog();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logDate: new Date().toISOString().split("T")[0],
      steps: 0,
      learningMinutes: 0,
      calls: 0,
      texts: 0,
      convos: 0,
      leads: 0,
      appts: 0,
      workoutDone: false,
      contentDone: false,
      notes: "",
      userId: "temp", // Will be overridden by backend or handled
      cohortId: 1, // Default for MVP
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values, {
      onSuccess: (data) => {
        toast({
          title: `Report Submitted: +${data.xpGain} XP`,
          description: "Your stats have been updated.",
          className: "bg-primary/20 border-primary text-white",
        });
        
        if (data.autoCompletedQuestIds.length > 0) {
           setTimeout(() => {
             toast({
               title: "QUEST COMPLETE",
               description: `${data.autoCompletedQuestIds.length} quests auto-completed!`,
               className: "bg-yellow-500/20 border-yellow-500 text-yellow-100",
             });
           }, 1000);
        }
        
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({
          title: "Submission Failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pl-64">
      <Navigation />

      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-display uppercase tracking-widest text-primary mb-2">Daily Report</h1>
          <p className="text-zinc-500 text-sm">Log your activities to update system stats.</p>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8 backdrop-blur-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-widest border-b border-zinc-800 pb-2">Physical</h3>
                  <FormField
                    control={form.control}
                    name="steps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Steps</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workoutDone"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4 bg-zinc-950">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Workout Complete</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-widest border-b border-zinc-800 pb-2">Business</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="calls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calls</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="convos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convos</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leads"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leads</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appts</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-widest border-b border-zinc-800 pb-2">Intel & Misc</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="learningMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning (Minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-zinc-950 border-zinc-800 focus:border-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contentDone"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4 bg-zinc-950 mt-auto h-[50px]">
                         <FormLabel className="text-base mb-0">Content Created</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mission Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Key insights, wins, or blockers..." 
                          className="bg-zinc-950 border-zinc-800 focus:border-primary min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-lg font-bold tracking-wider"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "SUBMIT REPORT"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
