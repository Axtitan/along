# Along — Abuja multimodal navigation MVP

A polished, mobile-first hackathon prototype for navigating Abuja the way people actually move: **walk → bus → keke → destination**.

## What works

- Free-text origin and destination search across Abuja using Nominatim
- Current-location GPS and origin/destination selection directly from the map
- Full Leaflet + OpenStreetMap basemap with transport layers and route fitting
- Ranked Fastest, Cheapest and Less-walking route options
- Map-first route display with stops and transfer points
- Nigerian-style step-by-step instructions
- Fare ranges, time, walking distance, transfers and confidence
- Deterministic navigation simulation with proximity-style steps
- Nigerian English voice selection: Azure Ezinne/Abeo online voices with secure server-side proxy and device fallback
- Browser geolocation permission flow with a safe fallback
- Community issue-report modal
- Installable PWA shell and offline caching of core files
- Responsive layouts for mobile, tablet and desktop

## Data status

All route, fare and stop records in this repository are labelled **prototype**. They are coherent demo data, not official transport information. Validate every route and fare through field research or trusted public sources before presenting it as real-world fact.

## Run locally

This is a dependency-free web app. Serve the folder over HTTP:

```bash
cd along-app
python3 -m http.server 4173
```

Open `http://localhost:4173`.

Geolocation and service workers require HTTP on localhost or HTTPS in production. Voice uses the browser's built-in `speechSynthesis` API.

## Demo

1. Keep **Berger Junction → Wuse Market** selected.
2. Choose **Find my route**.
3. Compare the three route cards.
4. Open the Fastest route and choose **Start navigation**.
5. Use **Simulate next step** to trigger the complete journey.
6. Toggle voice if the presentation venue is noisy.

The expanded prototype graph contains 20 hubs and 32 bidirectional links, including Kubwa, Gwarinpa, Jabi, Wuse, Central Area, Area 1, Garki, Apo, Lugbe, Nyanya and Mararaba.

## Structure

- `index.html` — accessible application shell
- `styles.css` — responsive design system and map presentation
- `app.js` — route data, ranking UI, route rendering, navigation, GPS and voice
- `data/network.json` — portable transport seed format
- `supabase/schema.sql` — future Postgres/Supabase source-of-truth schema
- `tests/validate.mjs` — dataset validation smoke test
- `manifest.webmanifest`, `sw.js` — PWA setup

## Architecture

The demo intentionally performs deterministic routing client-side for reliability. The next production step is to split the dataset and graph logic into TypeScript services and load verified city datasets from Supabase. Each city should remain an independent transport graph.

The AI layer, if added, may only rephrase structured route results. It must never invent routes, stops, fares or travel times.

## Deploy

Deploy to Vercel for the included Nigerian voice endpoint. No frontend build command is required. Configure `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` as server-side environment variables to enable Ezinne and Abeo; without them the app uses the best device voice. See `VOICE_AND_MAP_SETUP.md`.

## Limitations

- Focused prototype network rather than full Abuja coverage
- Full live OpenStreetMap tiles require an internet connection
- Public Nominatim is appropriate for light prototype use, not production-scale traffic
- Deterministic simulation rather than live vehicle tracking
- Community reports remain local UI demonstrations
- No authentication, payment, booking or driver features

## Production roadmap

1. Field-verify stops, sequences and fares.
2. Replace the stylised map with Leaflet + OpenStreetMap.
3. Move routing graph creation to a typed service and test Dijkstra scoring.
4. Connect Supabase for versioned route data and report moderation.
5. Add low-data caching and additional verified Abuja corridors.
