import "server-only";
import { parseEwkbPoint } from "./domain/geo";
import { buildNominatimSearchUrl, normalizeGeocodeQuery, parseNominatimResponse, type GeocodeResult } from "./domain/geocode";
import { getServerEnv } from "./server-env";
import { createSupabaseAdminClient } from "./supabase/admin";
import { unwrap } from "./supabase/unwrap";

// Geocodifica lato server con Nominatim (OpenStreetMap). Regole d'uso di Nominatim: User-Agent che identifica il
// progetto (NOMINATIM_USER_AGENT, mai un'email personale), massimo 1 richiesta al secondo, risultati in cache.
// La cache (geocode_cache) è solo per service_role, quindi si usa il client admin: contiene indirizzi di luoghi, non persone.
// Il ritmo vale per questo processo; su Vercel ogni istanza ha il suo, per questo le action hanno anche un limite per utente.

const MIN_INTERVAL_MS = 1000;
const TIMEOUT_MS = 8000;
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function waitForSlot(): Promise<void> {
  const slot = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  queue = slot.catch(() => undefined);
  return slot;
}

async function readCache(query: string): Promise<{ hit: boolean; result: GeocodeResult | null }> {
  const supabase = createSupabaseAdminClient();
  const row = unwrap(
    await supabase.from("geocode_cache").select("location, display_name").eq("query_normalized", query).maybeSingle(),
  );
  if (!row) return { hit: false, result: null };
  const point = parseEwkbPoint(row.location);
  // Una riga in cache senza punto vuol dire "Nominatim non ha trovato niente": non si chiede di nuovo.
  return { hit: true, result: point ? { lng: point[0], lat: point[1], displayName: row.display_name ?? "" } : null };
}

async function writeCache(query: string, result: GeocodeResult | null): Promise<void> {
  const supabase = createSupabaseAdminClient();
  unwrap(
    await supabase.from("geocode_cache").upsert({
      query_normalized: query,
      location: result ? `SRID=4326;POINT(${result.lng} ${result.lat})` : null,
      display_name: result?.displayName ?? null,
    }),
  );
}

/**
 * Punto di un indirizzo nella Comunidad de Madrid, oppure null se non si trova.
 * Lancia un errore quando Nominatim o la cache falliscono (chi chiama mostra un errore generico): un fallimento non va mai in cache.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = normalizeGeocodeQuery(address);
  if (!query) return null;

  const cached = await readCache(query);
  if (cached.hit) return cached.result;

  await waitForSlot();
  const response = await fetch(buildNominatimSearchUrl(query), {
    headers: { "user-agent": getServerEnv().NOMINATIM_USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
  const result = parseNominatimResponse(await response.json());
  await writeCache(query, result);
  return result;
}
