# Online voice and map setup

## Nigerian English voices

The app supports Microsoft's official Azure Speech voices:

- `en-NG-EzinneNeural`
- `en-NG-AbeoNeural`

The browser never receives the Azure key. `api/tts.js` is a Vercel serverless endpoint that reads `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` from server-side environment variables. Without them, navigation automatically prefers an installed `en-NG` Web Speech voice and then falls back to another English device voice.

For Vercel, add both variables under Project Settings → Environment Variables and redeploy.

## Map and place search

- Map renderer: Leaflet 1.9.4
- Basemap: OpenStreetMap standard tiles with attribution
- Search and reverse geocoding: Nominatim
- Search requests are delayed and limited to user interaction; do not use the public Nominatim endpoint for bulk geocoding.
- Production traffic should use a dedicated geocoding provider or self-hosted Nominatim and a commercial/self-hosted tile endpoint that matches expected load.

## Transport coverage

Users can search or drop pins for arbitrary origins and destinations in and around Abuja. The routing engine connects those coordinates to the closest hub in the current prototype graph. The graph contains 32 bidirectional bus, keke and taxi links across 20 hubs.

This does not make informal-transit data universally complete. All current transport links and fares remain prototype estimates pending field verification.
