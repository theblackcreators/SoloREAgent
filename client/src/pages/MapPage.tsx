import { Navigation } from "@/components/Navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLocations, useCheckIn } from "@/hooks/use-locations";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for default Leaflet icon not showing
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPage() {
  const { data: locations, isLoading } = useLocations("1"); // Hardcoded cohort for MVP
  const { mutate: checkIn, isPending } = useCheckIn();
  const { toast } = useToast();

  const handleCheckIn = (locationId: number) => {
    checkIn({ locationId, cohortId: 1 }, {
      onSuccess: () => {
        toast({
           title: "Location Secured",
           description: "You have successfully checked in.",
           className: "bg-green-900 border-green-800 text-white",
        });
      },
      onError: () => {
        toast({
          title: "Check-in Failed",
          description: "Are you close enough to the location?",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-primary font-mono">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        LOADING CARTOGRAPHY...
      </div>
    );
  }

  // Center on Houston by default, or the first location
  const centerPosition: [number, number] = locations && locations.length > 0 
    ? [Number(locations[0].lat), Number(locations[0].lng)] 
    : [29.7604, -95.3698]; // Houston

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row">
      <div className="hidden md:block">
        <Navigation />
      </div>
      <div className="md:hidden">
        <Navigation /> 
      </div>

      <div className="flex-1 relative md:pl-64 h-screen">
        <div className="absolute top-4 left-4 md:left-72 z-[1000] bg-zinc-950/80 backdrop-blur border border-zinc-800 p-4 rounded-lg max-w-sm">
          <h2 className="text-white font-display font-bold text-lg flex items-center gap-2">
            <MapPin className="text-primary" />
            ZONE MAP
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Visit these locations to claim territory and earn XP.
          </p>
        </div>

        <MapContainer center={centerPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locations?.map((loc) => {
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker key={loc.id} position={[lat, lng]}>
                <Popup className="custom-popup">
                  <div className="p-1">
                    <h3 className="font-bold font-display text-lg mb-1">{loc.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2 capitalize">{loc.category}</p>
                    <p className="text-sm mb-3">{loc.suggestedMission}</p>
                    <Button 
                      onClick={() => handleCheckIn(loc.id)} 
                      disabled={isPending}
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                    >
                      {isPending ? "SCANNING..." : "CHECK IN"}
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
