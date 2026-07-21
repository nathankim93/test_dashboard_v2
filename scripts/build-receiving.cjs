/**
 * Reads Amberroad GR Excel and writes aggregated JSON for the 1088 Receiving Dashboard.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const EXCEL_CANDIDATES = [
  path.join(
    "c:",
    "Users",
    "nkim60",
    "OneDrive - Nike",
    "바탕 화면",
    "Amberroad_GR",
    "AP_MUL_KR_In-transit_SLIM9_2019_JLE368_VER4.xlsx"
  ),
  path.join(__dirname, "source", "AP_MUL_KR_In-transit_SLIM9_2019_JLE368_VER4.xlsx"),
];

const OUT_PATH = path.join(__dirname, "..", "public", "data", "receiving.json");

const DIV_MAP = { "10": "AP", "20": "FW", "30": "EQ" };
const DIV_ORDER = ["AP", "FW", "EQ"];

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseGrDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // e.g. "20-Jul-2026" or "20-Jul-2026 23:59:59 ..."
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2]];
  const year = parseInt(m[3], 10);
  if (mon == null) return null;
  return new Date(year, mon, day);
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtLabel(d) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}`;
}

/** ISO week: Monday start */
function getWeekKey(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (tmp.getDay() + 6) % 7; // Mon=0
  tmp.setDate(tmp.getDate() - day);
  const weekStart = new Date(tmp);
  const weekEnd = new Date(tmp);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return {
    key: fmtDate(weekStart),
    label: `${fmtLabel(weekStart)} ~ ${fmtLabel(weekEnd)}`,
    start: weekStart,
    end: weekEnd,
  };
}

function num(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function findExcel() {
  for (const p of EXCEL_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function emptyDivBucket() {
  return { AP: 0, FW: 0, EQ: 0, total: 0 };
}

function addDiv(bucket, divCode, units, cartons) {
  const name = DIV_MAP[String(divCode)] || "OTHER";
  if (!bucket[name]) bucket[name] = { units: 0, cartons: 0 };
  bucket[name].units += units;
  bucket[name].cartons += cartons;
  bucket._total = bucket._total || { units: 0, cartons: 0 };
  bucket._total.units += units;
  bucket._total.cartons += cartons;
}

function main() {
  const excelPath = findExcel();
  if (!excelPath) {
    console.error("ERROR: Excel file not found.");
    EXCEL_CANDIDATES.forEach((p) => console.error("  tried:", p));
    process.exit(1);
  }

  console.log("Reading:", excelPath);
  const wb = XLSX.readFile(excelPath);
  const sheetName = wb.SheetNames.includes("Report_Sheet_1")
    ? "Report_Sheet_1"
    : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: false,
  });

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const r = rows[i] || [];
    if (r.includes("Shipment Type (Sh)") && r.includes("SEASON")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    console.error("ERROR: Could not find header row.");
    process.exit(1);
  }

  const headers = rows[headerIdx];
  const col = (name) => headers.indexOf(name);
  const idx = {
    division: col("Division (PO Ln)"),
    season: col("SEASON"),
    mot: col("Mode of Transport Code (PO Ln)"),
    shipmentType: col("Shipment Type (Sh)"),
    grDate: col("Actual Goods Receipt (Sh Ln)"),
    units: col("Total Shipped Quantity (Sh Ln)"),
    cartons: col("Total Cartons (Sh Ln)"),
    warehouse: col("Warehouse ID (PO Ln)"),
  };

  const records = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r[idx.shipmentType] == null) continue;
    const type = String(r[idx.shipmentType]).trim();
    if (type !== "Z001" && type !== "Z010") continue;

    const gr = parseGrDate(r[idx.grDate]);
    if (!gr) continue;

    const wh = idx.warehouse >= 0 ? String(r[idx.warehouse] || "").trim() : "1088";
    // Prefer warehouse 1088 if column present; otherwise keep all (already filtered in source)
    if (wh && wh !== "1088" && wh !== "") continue;

    records.push({
      type,
      division: String(r[idx.division] || "").trim(),
      season: String(r[idx.season] || "Unknown").trim() || "Unknown",
      mot: String(r[idx.mot] || "Unknown").trim() || "Unknown",
      date: fmtDate(gr),
      dateObj: gr,
      units: num(r[idx.units]),
      cartons: num(r[idx.cartons]),
    });
  }

  if (records.length === 0) {
    console.error("ERROR: No data rows after filter.");
    process.exit(1);
  }

  // Latest GR date in dataset = "as of" / Daily reference
  const maxDate = records.reduce(
    (a, b) => (b.dateObj > a ? b.dateObj : a),
    records[0].dateObj
  );
  const maxDateStr = fmtDate(maxDate);
  const weekInfo = getWeekKey(maxDate);

  function aggregate(filterFn) {
    const dailyByDate = {}; // date -> { AP:{u,c}, FW..., _total }
    const weeklyByWeek = {}; // weekKey -> same
    const season = {}; // season -> {units, cartons}
    const mot = {};
    let daily = { units: 0, cartons: 0, byDiv: { AP: { units: 0, cartons: 0 }, FW: { units: 0, cartons: 0 }, EQ: { units: 0, cartons: 0 } } };
    let weekly = { units: 0, cartons: 0, byDiv: { AP: { units: 0, cartons: 0 }, FW: { units: 0, cartons: 0 }, EQ: { units: 0, cartons: 0 } } };
    let all = { units: 0, cartons: 0, byDiv: { AP: { units: 0, cartons: 0 }, FW: { units: 0, cartons: 0 }, EQ: { units: 0, cartons: 0 } }, lines: 0 };

    records.filter(filterFn).forEach((rec) => {
      const divName = DIV_MAP[rec.division] || null;
      all.units += rec.units;
      all.cartons += rec.cartons;
      all.lines += 1;
      if (divName && all.byDiv[divName]) {
        all.byDiv[divName].units += rec.units;
        all.byDiv[divName].cartons += rec.cartons;
      }

      // daily series
      if (!dailyByDate[rec.date]) {
        dailyByDate[rec.date] = {
          AP: { units: 0, cartons: 0 },
          FW: { units: 0, cartons: 0 },
          EQ: { units: 0, cartons: 0 },
          _total: { units: 0, cartons: 0 },
        };
      }
      if (divName) {
        dailyByDate[rec.date][divName].units += rec.units;
        dailyByDate[rec.date][divName].cartons += rec.cartons;
      }
      dailyByDate[rec.date]._total.units += rec.units;
      dailyByDate[rec.date]._total.cartons += rec.cartons;

      // weekly series
      const wk = getWeekKey(rec.dateObj);
      if (!weeklyByWeek[wk.key]) {
        weeklyByWeek[wk.key] = {
          label: wk.label,
          AP: { units: 0, cartons: 0 },
          FW: { units: 0, cartons: 0 },
          EQ: { units: 0, cartons: 0 },
          _total: { units: 0, cartons: 0 },
        };
      }
      if (divName) {
        weeklyByWeek[wk.key][divName].units += rec.units;
        weeklyByWeek[wk.key][divName].cartons += rec.cartons;
      }
      weeklyByWeek[wk.key]._total.units += rec.units;
      weeklyByWeek[wk.key]._total.cartons += rec.cartons;

      // season / mot
      if (!season[rec.season]) season[rec.season] = { units: 0, cartons: 0 };
      season[rec.season].units += rec.units;
      season[rec.season].cartons += rec.cartons;
      if (!mot[rec.mot]) mot[rec.mot] = { units: 0, cartons: 0 };
      mot[rec.mot].units += rec.units;
      mot[rec.mot].cartons += rec.cartons;

      // KPI: daily = max date
      if (rec.date === maxDateStr) {
        daily.units += rec.units;
        daily.cartons += rec.cartons;
        if (divName && daily.byDiv[divName]) {
          daily.byDiv[divName].units += rec.units;
          daily.byDiv[divName].cartons += rec.cartons;
        }
      }

      // KPI: weekly = week of max date
      if (rec.dateObj >= weekInfo.start && rec.dateObj <= weekInfo.end) {
        weekly.units += rec.units;
        weekly.cartons += rec.cartons;
        if (divName && weekly.byDiv[divName]) {
          weekly.byDiv[divName].units += rec.units;
          weekly.byDiv[divName].cartons += rec.cartons;
        }
      }
    });

    const dailySeries = Object.keys(dailyByDate)
      .sort()
      .map((d) => {
        const [y, m, day] = d.split("-").map(Number);
        const dt = new Date(y, m - 1, day);
        return {
          date: d,
          label: fmtLabel(dt),
          AP: dailyByDate[d].AP,
          FW: dailyByDate[d].FW,
          EQ: dailyByDate[d].EQ,
          total: dailyByDate[d]._total,
        };
      });

    const weeklySeries = Object.keys(weeklyByWeek)
      .sort()
      .map((k) => ({
        week: k,
        label: weeklyByWeek[k].label,
        AP: weeklyByWeek[k].AP,
        FW: weeklyByWeek[k].FW,
        EQ: weeklyByWeek[k].EQ,
        total: weeklyByWeek[k]._total,
      }));

    return {
      dailyKpi: daily,
      weeklyKpi: weekly,
      all,
      dailySeries,
      weeklySeries,
      season,
      mot,
    };
  }

  const normal = aggregate((r) => r.type === "Z001");
  const drs = aggregate((r) => r.type === "Z010");
  const allMot = {};
  records.forEach((rec) => {
    if (!allMot[rec.mot]) allMot[rec.mot] = { units: 0, cartons: 0 };
    allMot[rec.mot].units += rec.units;
    allMot[rec.mot].cartons += rec.cartons;
  });

  const output = {
    meta: {
      warehouse: "1088",
      sourceFile: path.basename(excelPath),
      sourcePath: excelPath,
      updatedAt: new Date().toISOString(),
      asOfDate: maxDateStr,
      asOfLabel: fmtLabel(maxDate),
      weekLabel: weekInfo.label,
      weekStart: fmtDate(weekInfo.start),
      weekEnd: fmtDate(weekInfo.end),
      recordCount: records.length,
      dateRange: {
        from: fmtDate(
          records.reduce((a, b) => (b.dateObj < a ? b.dateObj : a), records[0].dateObj)
        ),
        to: maxDateStr,
      },
      divisions: DIV_ORDER,
      divisionLabels: { AP: "10 · AP", FW: "20 · FW", EQ: "30 · EQ" },
    },
    normal, // Z001
    drs, // Z010
    mot: allMot,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8");
  console.log("Wrote:", OUT_PATH);
  console.log(
    `Records: ${records.length} | As-of: ${maxDateStr} | Week: ${weekInfo.label}`
  );
  console.log(
    `Normal Z001 daily units: ${normal.dailyKpi.units} | weekly: ${normal.weeklyKpi.units}`
  );
  console.log(
    `DRS Z010 daily units: ${drs.dailyKpi.units} | weekly: ${drs.weeklyKpi.units}`
  );
}

main();
