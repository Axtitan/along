import assert from "node:assert/strict";
import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync(new URL("../data/network.json", import.meta.url)),
);
assert.equal(data.city.id, "abuja");
assert(data.stops.length >= 20);
assert(data.routes.length >= 30);
const ids = new Set();
for (const stop of data.stops) {
  assert(!ids.has(stop.id), `duplicate stop ${stop.id}`);
  ids.add(stop.id);
  assert(Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  assert(stop.lat > 8.5 && stop.lat < 9.5 && stop.lng > 7 && stop.lng < 8);
  assert.equal(stop.source, "prototype");
}
for (const route of data.routes) {
  assert(ids.has(route.from) && ids.has(route.to));
  assert(route.from !== route.to);
  assert(route.fareMin <= route.fareMax);
  assert(["bus", "keke", "taxi"].includes(route.vehicleType));
  assert(route.minutes > 0);
  assert.equal(route.source, "prototype");
}
console.log(
  `Validated ${data.stops.length} hubs and ${data.routes.length} bidirectional prototype links.`,
);
