/**
 * Aggregate Query_Jul2026.xlsx pivot cache into dashboard JSON.
 * Supports updated cache fields including Item (SKU Count).
 *
 * Expected fields (order may vary; resolved by name):
 * Date, Current Location Zone, LPN, Division, Item, Total Units, Season, Life Cycle
 * (+ optional Current Location, Attr 1, Attr 2)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_XLSX =
  process.argv[2] ||
  "c:/Users/nkim60/OneDrive - Nike/바탕 화면/Power Query/Query_Jul2026.xlsx";
const OUT = path.join(ROOT, "public", "data", "inventory.json");

const ZONE_MAP = {
  "30": "HighBay",
  "81": "INFINITY",
  "82": "INFINITY",
  "83": "INFINITY",
  "02": "Pickface",
  "04": "Pickface",
  "05": "Pickface",
  "06": "Pickface",
  "08": "Pickface",
};

const DIV_MAP = { "10": "AP", "20": "FW", "30": "EQ" };
const STORAGE_KEYS = ["HighBay", "INFINITY", "Pickface"];

function parseCacheDefinition(xml) {
  const fields = [];
  const fieldRe = /<cacheField name="([^"]+)"[^>]*>([\s\S]*?)<\/cacheField>/g;
  let m;
  while ((m = fieldRe.exec(xml))) {
    const name = m[1];
    const body = m[2];
    const items = [];
    const itemRe = /<(?:n|s|d)\s+v="([^"]*)"\s*\/?>|<m\s*\/>/g;
    let im;
    while ((im = itemRe.exec(body))) {
      if (im[0].startsWith("<m")) items.push(null);
      else items.push(im[1]);
    }
    fields.push({ name, items });
  }
  return fields;
}

function fieldIndex(fields, name) {
  const i = fields.findIndex((f) => f.name === name);
  if (i < 0) throw new Error('Required pivot cache field missing: "' + name + '"');
  return i;
}

function resolveCell(cell, sharedItems) {
  if (!cell || cell.t === "m") return null;
  if (cell.t === "x") {
    const idx = Number(cell.v);
    return sharedItems[idx] != null ? String(sharedItems[idx]) : null;
  }
  if (cell.t === "n") return cell.v;
  if (cell.t === "s") return cell.v;
  return null;
}

function resolveCachePaths(xlsxPath) {
  const localUnzip = path.join(ROOT, "_xlsx_unzip");
  const tmp = path.join(os.tmpdir(), "inv_flow_pivot_extract");

  const tryUse = (base) => {
    const cacheDef = path.join(base, "xl", "pivotCache", "pivotCacheDefinition1.xml");
    const cacheRec = path.join(base, "xl", "pivotCache", "pivotCacheRecords1.xml");
    if (!fs.existsSync(cacheRec) || !fs.existsSync(cacheDef)) return null;
    const srcM = fs.statSync(xlsxPath).mtimeMs;
    const recM = fs.statSync(cacheRec).mtimeMs;
    if (recM + 2000 < srcM) return null;
    return { cacheDef, cacheRec, tmp: base };
  };

  const existing = tryUse(localUnzip) || tryUse(tmp);
  if (existing) return existing;

  const out = localUnzip;
  if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const zipPath = path.join(os.tmpdir(), "inv_flow_query.zip");
  fs.copyFileSync(xlsxPath, zipPath);

  console.log("Extracting xlsx (first time or source updated)...");
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" }
  );

  const cacheDef = path.join(out, "xl", "pivotCache", "pivotCacheDefinition1.xml");
  const cacheRec = path.join(out, "xl", "pivotCache", "pivotCacheRecords1.xml");
  if (!fs.existsSync(cacheRec)) {
    throw new Error("pivotCacheRecords1.xml not found — is this a Query pivot workbook?");
  }
  return { cacheDef, cacheRec, tmp: out };
}

function emptyDivBucket() {
  return {
    AP: { units: 0, cartons: 0, skus: new Set() },
    FW: { units: 0, cartons: 0, skus: new Set() },
    EQ: { units: 0, cartons: 0, skus: new Set() },
  };
}

function ensureDaily(daily, date) {
  if (!daily[date]) {
    daily[date] = {
      Total: emptyDivBucket(),
      HighBay: emptyDivBucket(),
      INFINITY: emptyDivBucket(),
      Pickface: emptyDivBucket(),
    };
  }
  return daily[date];
}

function addTo(bucket, div, units, item) {
  const d = DIV_MAP[div] || null;
  if (!d) return;
  bucket[d].units += units;
  bucket[d].cartons += 1;
  if (item) bucket[d].skus.add(item);
}

function aggregateStream(cacheRecPath, fields) {
  const idxDate = fieldIndex(fields, "Date");
  const idxZone = fieldIndex(fields, "Current Location Zone");
  const idxDiv = fieldIndex(fields, "Division");
  const idxItem = fieldIndex(fields, "Item");
  const idxUnits = fieldIndex(fields, "Total Units");
  const idxSeason = fieldIndex(fields, "Season");
  const idxLc = fieldIndex(fields, "Life Cycle");
  const fieldCount = fields.length;

  const dateItems = fields[idxDate].items;
  const zoneItems = fields[idxZone].items;
  const divItems = fields[idxDiv].items;
  const itemItems = fields[idxItem].items;
  const seasonItems = fields[idxSeason].items;
  const lcItems = fields[idxLc].items;

  const daily = {};
  const byDateSeason = {};
  const byDateLifeCycle = {};
  let recordCount = 0;
  let latestDate = "";

  function emptyLcDivBucket() {
    return {
      AP: { units: 0, cartons: 0 },
      FW: { units: 0, cartons: 0 },
      EQ: { units: 0, cartons: 0 },
    };
  }

  function addLc(bucket, div, units) {
    const d = DIV_MAP[div] || null;
    if (!d) return;
    bucket[d].units += units;
    bucket[d].cartons += 1;
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(cacheRecPath, {
      encoding: "utf8",
      highWaterMark: 8 * 1024 * 1024,
    });
    let buf = "";

    stream.on("data", (chunk) => {
      buf += chunk;
      let start = 0;
      while (true) {
        const i = buf.indexOf("<r>", start);
        if (i < 0) break;
        const j = buf.indexOf("</r>", i);
        if (j < 0) break;
        const rec = buf.slice(i, j + 4);
        start = j + 4;
        recordCount++;

        const cells = [];
        const cellRe = /<(x|n|s)\s+v="([^"]*)"\s*\/>|<m\s*\/>/g;
        let cm;
        while ((cm = cellRe.exec(rec)) && cells.length < fieldCount) {
          if (cm[0].startsWith("<m")) cells.push({ t: "m" });
          else cells.push({ t: cm[1], v: cm[2] });
        }
        if (cells.length < fieldCount) continue;

        const date = resolveCell(cells[idxDate], dateItems);
        const zone = resolveCell(cells[idxZone], zoneItems);
        const div = resolveCell(cells[idxDiv], divItems);
        const itemRaw = resolveCell(cells[idxItem], itemItems);
        const item = itemRaw != null && String(itemRaw).trim() ? String(itemRaw).trim() : null;
        const unitsRaw = resolveCell(cells[idxUnits], fields[idxUnits].items);
        const units = Number(unitsRaw) || 0;
        const season = resolveCell(cells[idxSeason], seasonItems);
        const lc = resolveCell(cells[idxLc], lcItems);

        if (!date || !zone || !div) continue;
        if (String(date) > latestDate) latestDate = String(date);

        if (!byDateSeason[date]) byDateSeason[date] = {};
        const sKey = season || "(Blank)";
        byDateSeason[date][sKey] = (byDateSeason[date][sKey] || 0) + units;

        if (!byDateLifeCycle[date]) {
          byDateLifeCycle[date] = {
            "Active (Inline)": emptyLcDivBucket(),
            "Inactive (Close-out)": emptyLcDivBucket(),
          };
        }
        const lcKey = lc || "Active (Inline)";
        if (!byDateLifeCycle[date][lcKey]) byDateLifeCycle[date][lcKey] = emptyLcDivBucket();
        addLc(byDateLifeCycle[date][lcKey], String(div), units);

        const storage = ZONE_MAP[String(zone)];
        if (storage) {
          const day = ensureDaily(daily, String(date));
          addTo(day.Total, String(div), units, item);
          addTo(day[storage], String(div), units, item);
        }

        if (recordCount % 500000 === 0) {
          process.stdout.write(`\rProcessed ${recordCount.toLocaleString()} records...`);
        }
      }
      buf = buf.slice(start);
      const lastR = buf.lastIndexOf("<r>");
      if (lastR > 0) buf = buf.slice(lastR);
      else if (buf.length > 2 * 1024 * 1024) buf = buf.slice(-1024);
    });

    stream.on("end", () => {
      process.stdout.write(`\rProcessed ${recordCount.toLocaleString()} records.\n`);
      resolve({ daily, byDateSeason, byDateLifeCycle, recordCount, latestDate });
    });
    stream.on("error", reject);
  });
}

function toDailySeries(daily) {
  const dates = Object.keys(daily).sort();
  return dates.map((date) => {
    const row = { date, storages: {} };
    for (const sk of ["Total", ...STORAGE_KEYS]) {
      const b = daily[date][sk];
      row.storages[sk] = {
        AP: { units: b.AP.units, cartons: b.AP.cartons, skus: b.AP.skus.size },
        FW: { units: b.FW.units, cartons: b.FW.cartons, skus: b.FW.skus.size },
        EQ: { units: b.EQ.units, cartons: b.EQ.cartons, skus: b.EQ.skus.size },
        totalUnits: b.AP.units + b.FW.units + b.EQ.units,
        totalCartons: b.AP.cartons + b.FW.cartons + b.EQ.cartons,
        totalSkus: b.AP.skus.size + b.FW.skus.size + b.EQ.skus.size,
      };
    }
    return row;
  });
}

function seasonPie(byDateSeason, latestDate) {
  const map = byDateSeason[latestDate] || {};
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
  const items = Object.entries(map)
    .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);

  const major = [];
  let others = 0;
  for (const it of items) {
    if (it.pct < 1) others += it.value;
    else major.push({ name: it.name, value: it.value });
  }
  if (others > 0) major.push({ name: "Others", value: others });
  return { date: latestDate, total, items: major };
}

function lifeCycleBars(byDateLifeCycle, latestDate) {
  const map = byDateLifeCycle[latestDate] || {};
  const categories = Object.keys(map);
  return {
    date: latestDate,
    categories: categories.map((name) => {
      const b = map[name];
      return {
        name,
        AP: b.AP.units,
        FW: b.FW.units,
        EQ: b.EQ.units,
        total: b.AP.units + b.FW.units + b.EQ.units,
      };
    }),
  };
}

function formatDateLabel(yyyymmdd) {
  const s = String(yyyymmdd);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

async function main() {
  console.log("Source:", DEFAULT_XLSX);
  if (!fs.existsSync(DEFAULT_XLSX)) {
    throw new Error("Excel not found: " + DEFAULT_XLSX);
  }

  console.log("Resolving pivot cache...");
  const { cacheDef, cacheRec } = resolveCachePaths(DEFAULT_XLSX);
  const fields = parseCacheDefinition(fs.readFileSync(cacheDef, "utf8"));
  console.log("Fields:", fields.map((f) => f.name).join(", "));

  // Fail early with a clear message if Item is missing
  fieldIndex(fields, "Item");

  console.log("Aggregating pivot cache (units / cartons / SKU)...");
  const agg = await aggregateStream(cacheRec, fields);
  const series = toDailySeries(agg.daily);
  const season = seasonPie(agg.byDateSeason, agg.latestDate);
  const lifeCycle = lifeCycleBars(agg.byDateLifeCycle, agg.latestDate);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(DEFAULT_XLSX),
    recordCount: agg.recordCount,
    latestDate: agg.latestDate,
    latestDateLabel: formatDateLabel(agg.latestDate),
    dates: series.map((d) => d.date),
    daily: series,
    season,
    lifeCycle,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));
  console.log("Wrote", OUT);
  console.log("Latest date:", payload.latestDateLabel, "| Records:", agg.recordCount.toLocaleString());

  const last = series[series.length - 1];
  if (last) {
    console.log(
      "Sample SKU (latest Total):",
      last.storages.Total.totalSkus.toLocaleString(),
      "| HighBay:",
      last.storages.HighBay.totalSkus.toLocaleString()
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
