import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCohorts, useInvites, useCreateInvite, useAdminCreateLocation, useGeocode } from "@/hooks/use-admin";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInviteSchema, insertLocationSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { z } from "zod";

export default function Admin() {
  const { user } = useAuth();
  const [activeCohort, setActiveCohort] = useState("1"); // Mock active
  
  if (user && user.email !== "admin@sololeveling.com" && !user.email?.includes("admin")) {
      // In a real app, check roles properly
      // return <div>Unauthorized</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pl-64">
      <Navigation />
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-primary mb-8">ADMIN CONSOLE</h1>

        <Tabs defaultValue="invites" className="space-y-8">
          <TabsList className="bg-zinc-900 border border-zinc-800 text-zinc-400">
            <TabsTrigger value="invites">INVITE CODES</TabsTrigger>
            <TabsTrigger value="locations">LOCATIONS</TabsTrigger>
          </TabsList>

          <TabsContent value="invites">
            <InviteManager cohortId={activeCohort} />
          </TabsContent>

          <TabsContent value="locations">
             <LocationManager cohortId={activeCohort} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InviteManager({ cohortId }: { cohortId: string }) {
  const { data: invites, isLoading } = useInvites(cohortId);
  const { mutate, isPending } = useCreateInvite();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertInviteSchema),
    defaultValues: {
      cohortId: parseInt(cohortId),
      code: "",
      role: "agent",
      maxUses: 1,
      isActive: true,
    }
  });

  const onSubmit = (data: any) => {
    mutate(data, {
      onSuccess: () => {
        toast({ title: "Invite Created" });
        form.reset();
      }
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <h3 className="font-bold mb-4">Create Invite</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl><Input {...field} className="bg-black" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="bg-black" /></FormControl>
                  </FormItem>
                )}
              />
              <Button disabled={isPending} className="w-full bg-primary hover:bg-primary/80">Generate</Button>
          </form>
        </Form>
      </div>

      <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <h3 className="font-bold mb-4">Active Invites</h3>
        <div className="space-y-2">
          {isLoading ? <Loader2 className="animate-spin" /> : invites?.map(inv => (
            <div key={inv.id} className="flex justify-between items-center p-3 bg-black rounded border border-zinc-800">
              <span className="font-mono text-primary">{inv.code}</span>
              <span className="text-xs text-zinc-500">{inv.uses} / {inv.maxUses} uses</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationManager({ cohortId }: { cohortId: string }) {
  const { mutate, isPending } = useAdminCreateLocation();
  const { toast } = useToast();
  const [addressQuery, setAddressQuery] = useState("");
  const { data: geoResults } = useGeocode(cohortId, addressQuery, !!addressQuery);

  const form = useForm({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      programId: 1, // Default
      zone: "Zone 1",
      name: "",
      category: "coffee",
      address: "",
      lat: "0",
      lng: "0",
      suggestedMission: "Take a photo and tag location"
    }
  });

  const fillAddress = (result: any) => {
    form.setValue("address", result.place_name);
    form.setValue("lat", String(result.lat));
    form.setValue("lng", String(result.lng));
    setAddressQuery(""); // clear suggestions
  };

  const onSubmit = (data: any) => {
    mutate(data, {
      onSuccess: () => {
        toast({ title: "Location Added" });
        form.reset();
      }
    });
  };

  return (
    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 max-w-2xl">
      <h3 className="font-bold mb-4">Add New Location</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name</FormLabel>
                <FormControl><Input {...field} className="bg-black" /></FormControl>
              </FormItem>
            )}
          />

          <div className="relative">
             <FormLabel>Address Search</FormLabel>
             <div className="flex gap-2">
               <Input 
                 value={addressQuery} 
                 onChange={e => setAddressQuery(e.target.value)} 
                 placeholder="Search address..."
                 className="bg-black"
               />
               <Button type="button" variant="outline" size="icon"><Search className="w-4 h-4" /></Button>
             </div>
             {geoResults?.results && geoResults.results.length > 0 && (
               <div className="absolute z-10 w-full bg-zinc-900 border border-zinc-700 mt-1 rounded-lg shadow-xl overflow-hidden">
                 {geoResults.results.map((res: any) => (
                   <div 
                     key={res.id} 
                     onClick={() => fillAddress(res)}
                     className="p-3 hover:bg-zinc-800 cursor-pointer text-sm border-b border-zinc-800 last:border-0"
                   >
                     {res.place_name}
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl><Input {...field} className="bg-black" readOnly /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl><Input {...field} className="bg-black" readOnly /></FormControl>
                  </FormItem>
                )}
              />
          </div>
          
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl><Input {...field} placeholder="coffee, park, gym..." className="bg-black" /></FormControl>
              </FormItem>
            )}
          />

           <FormField
            control={form.control}
            name="suggestedMission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suggested Mission</FormLabel>
                <FormControl><Input {...field} className="bg-black" /></FormControl>
              </FormItem>
            )}
          />

          <Button disabled={isPending} className="w-full bg-primary hover:bg-primary/80 mt-4">Create Location</Button>
        </form>
      </Form>
    </div>
  );
}
