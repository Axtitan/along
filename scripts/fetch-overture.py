"""
Exports Overture Maps places in the Abuja area to JSON for scripts/build-places.mjs.

    pip install duckdb
    python scripts/fetch-overture.py overture-abuja.json [release]
    node scripts/build-places.mjs --overture overture-abuja.json

Overture data is free and open (CDLA-Permissive-2.0 / ODbL depending on source);
see https://docs.overturemaps.org/attribution/. Releases: https://docs.overturemaps.org/release/latest/
"""
import json
import sys

import duckdb

out_path = sys.argv[1] if len(sys.argv) > 1 else "overture-abuja.json"
release = sys.argv[2] if len(sys.argv) > 2 else "2026-09-23.1"
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
rows = con.execute(
    f"""
    SELECT names."primary", basic_category, addresses[1].freeform,
           round((bbox.ymin + bbox.ymax) / 2, 5), round((bbox.xmin + bbox.xmax) / 2, 5), round(confidence, 2)
    FROM read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*', hive_partitioning=1)
    WHERE bbox.xmin BETWEEN 7.0 AND 7.75 AND bbox.ymin BETWEEN 8.75 AND 9.35
      AND coalesce(operating_status, 'open') = 'open'
    """
).fetchall()
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False)
print(f"Wrote {len(rows)} places to {out_path}")
