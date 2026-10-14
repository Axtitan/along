# Along — get around Abuja

Along plans trips across Abuja the way people actually move: a keke or okada to the main road,
a bus or shared cab "along" the corridor, and a short hop to the door. It's free to run: no paid APIs.

## What it does

- **Search that knows Abuja, even with typos.** Suggestions appear from the first letter, from an
  offline index of ~9,300 named Abuja places and streets (`public/data/abuja-places.json`, built from
  OpenStreetMap and Overture Maps). Many Abuja streets are missing from OpenStreetMap, so ~540 more
  are recovered from business addresses in Overture (e.g. "Plot 1088 Isiyaku Ismaila Crescent, Wuye")
  and shown as approximate. If a place still isn't found, "Put … on the map" lets you drop a pin
  with the name you typed; Along remembers it for next time. Matching forgives misspellings and abbreviations ("jabi laek", "natinal hosp",
  "aminu kano cres"). When typing pauses, an online search (Nominatim + Photon) adds anything the
  offline list doesn't know, retrying with corrected spelling if needed. "Use my current location",
  recent places, keyboard navigation and "choose on the map" are built in.
- **Realistic first and last mile.** Along never suggests walking more than about 500 m (800 m inside
  the city centre). Longer hops become a keke, okada or cab, depending on where you are:
  - **Keke and okada only where they are allowed.** The FCTA bans them from the city centre and the
    expressways; they operate in satellite towns (Kubwa, Nyanya, Karu, Lugbe, Gwagwalada, Kuje, Bwari…)
    and inside estates. Okada are further restricted in Phase 2 districts. See `lib/zones.ts`.
  - **Cabs everywhere else**, with a nudge to book Bolt/inDrive if no cab passes.
- **Real corridors.** 48 boarding points and 24 bus, shared-cab and keke lines (Kubwa Expressway,
  Keffi Expressway, Airport Road, Apo, Lugbe–Kuje, Life Camp–Gwarinpa and more). You board once and
  drop anywhere along the line, so the fare is one ride, not a sum of every stop.
- **Up to four options:** best route, cheapest, fewest changes, and a door-to-door Bolt/inDrive estimate.
- **2026 fares.** Fare models are calibrated against published Abuja commuter fares (see below) and
  shown as ranges, because fares are negotiated and move with fuel prices.
- **Trip mode** follows your GPS and moves to the next step when you reach each stop, with optional
  spoken directions. You can also step through manually.
- Road-following route lines, a softer map style, and a layout that's a bottom sheet on phones and a
  floating panel on desktop.

## Data sources

| What | Source |
| --- | --- |
| Map tiles, place names, stop coordinates | © OpenStreetMap contributors (ODbL) |
| Offline place index | OpenStreetMap (ODbL) + Overture Maps places (CDLA-Permissive-2.0), see `scripts/` |
| Online search | Nominatim and Photon (komoot) |
| Road geometry | FOSSGIS OSRM (`routing.openstreetmap.de`); OpenRouteService if `ORS_API_KEY` is set |
| Keke/okada rules | FCTA statements and DRTS enforcement reports (Tribune & Channels TV, Aug 2026; 21st Century Chronicle, Oct 2022; Leadership, 2024) |
| Bus/cab fares | ICIR (10 Mar 2026), Leadership (2026), Daily Trust (27 Apr 2026) |
| Keke fares | MSME Africa (20 Sep 2026) |
| Bolt estimate | Bolt's last published Abuja rate card (Aug 2024), with a +40% upper bound |

Each corridor's fare check and source is recorded next to it in `lib/network.ts`, and the fare formulas
are documented in `lib/fares.ts`. Fares are estimates; the app tells riders to confirm with the driver.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables are required. `.env.example` lists optional
free-tier keys (OpenRouteService for route lines, Azure Speech for Nigerian voices).

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

To refresh the offline place index (OpenStreetMap + Overture Maps) every few months:

```bash
pip install -r scripts/requirements.txt
npm run update:places
```

`update:places` runs `fetch:overture` (Overture places via DuckDB, ~15 s) then `build:places`
(OpenStreetMap via the Overpass API, which retries automatically when the free server is busy).

## Structure

- `app/page.tsx` — layout: full-screen map with the planner / results / trip panel
- `app/api/geocode` — Photon/Nominatim proxy with caching and short labels
- `app/api/directions` — road geometry (ORS or OSRM) with validation and caching
- `lib/network.ts` — boarding points and corridors (with fare checks and sources)
- `lib/zones.ts` — where keke and okada may operate
- `lib/fares.ts` — fare and speed models
- `lib/router.ts` — multi-modal route search (first/last mile + corridors)
- `lib/places.ts` — offline place index (hubs, landmarks, OSM places) and search
- `lib/fuzzy.ts` — typo-tolerant matching and spelling correction
- `components/` — map, search field, panels, settings

## Limitations

- Corridors are curated from public reports and local knowledge, not live vehicle data. Use
  **Settings → Report an issue** to log corrections (stored on the device until there's a backend).
- Times are estimates and don't include live traffic.
- Public Photon, Nominatim, OSRM and OpenStreetMap tile servers are free community services with
  fair-use policies. They're fine for an MVP; heavy traffic will need self-hosting or a sponsor.
- The keke/okada zones follow published FCTA notices. The FCTA said in Aug 2026 that it is re-mapping
  restricted areas, so `lib/zones.ts` should be updated when that list is published.
