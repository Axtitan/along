const json = (res, status, body) => {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  res.send(JSON.stringify(body));
};
const nameFromPhoton = (p) =>
  [p.name, p.street, p.district, p.city, p.state, p.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4)
    .join(", ");
// FIX 10: abort upstream fetches after 4 s so a slow provider can't block the serverless function
const withTimeout = (ms) => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
};
module.exports = async function handler(req, res) {
  if (req.method !== "GET")
    return json(res, 405, { error: "Method not allowed" });
  try {
    if (req.query.lat && req.query.lon) {
      const u = new URL("https://nominatim.openstreetmap.org/reverse");
      u.search = new URLSearchParams({
        lat: req.query.lat,
        lon: req.query.lon,
        format: "jsonv2",
        zoom: "18",
        addressdetails: "1",
      });
      const r = await fetch(u, {
        headers: {
          "User-Agent": "Along-Abuja-MVP/1.0",
          "Accept-Language": "en-NG,en",
        },
        signal: withTimeout(4000),
      });
      if (!r.ok) throw Error("reverse failed");
      const x = await r.json();
      return json(res, 200, {
        results: [
          {
            name: x.display_name,
            lat: +x.lat,
            lng: +x.lon,
            type: x.type || "place",
          },
        ],
      });
    }
    const q = String(req.query.q || "").trim();
    if (q.length < 2)
      return json(res, 400, { error: "Enter at least two characters" });
    const u = new URL("https://nominatim.openstreetmap.org/search");
    u.search = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "8",
      addressdetails: "1",
      countrycodes: "ng",
      viewbox: "7.20,9.30,7.75,8.80",
      bounded: "0",
    });
    let r = await fetch(u, {
        headers: {
          "User-Agent": "Along-Abuja-MVP/1.0",
          "Accept-Language": "en-NG,en",
        },
        signal: withTimeout(4000),
      }),
      items = [];
    if (r.ok)
      items = (await r.json()).map((x) => ({
        name: x.display_name,
        lat: +x.lat,
        lng: +x.lon,
        type: x.type || "place",
      }));
    if (!items.length) {
      const p = new URL("https://photon.komoot.io/api/");
      p.search = new URLSearchParams({
        q,
        limit: "8",
        lat: "9.0556",
        lon: "7.4914",
        lang: "en",
      });
      r = await fetch(p, { signal: withTimeout(4000) });
      if (r.ok)
        items = (await r.json()).features
          .filter((x) => x.properties.countrycode === "NG")
          .map((x) => ({
            name: nameFromPhoton(x.properties),
            lat: x.geometry.coordinates[1],
            lng: x.geometry.coordinates[0],
            type: x.properties.type || "place",
          }));
    }
    return json(res, 200, { results: items });
  } catch (e) {
    return json(res, 502, {
      error: "Location search is temporarily unavailable",
    });
  }
};
