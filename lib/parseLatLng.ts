export function parseLatLng(
  input: string
): { lat: number; lng: number } | null {
  const s = (input || "").trim();

  // 1) raw "lat,lng"
  const raw = s.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (raw) return { lat: Number(raw[1]), lng: Number(raw[2]) };

  // 2) Google Maps "@lat,lng" (common share links)
  const at = s.match(/@(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

  // 3) "q=lat,lng" or "query=lat,lng"
  const q = s.match(/[?&](q|query)=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)/i);
  if (q) return { lat: Number(q[2]), lng: Number(q[3]) };

  // 4) "q=lat,lng" not URL-encoded comma
  const q2 = s.match(/[?&](q|query)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/i);
  if (q2) return { lat: Number(q2[2]), lng: Number(q2[3]) };

  // 5) "ll=lat,lng"
  const ll = s.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/i);
  if (ll) return { lat: Number(ll[1]), lng: Number(ll[2]) };

  return null;
}

