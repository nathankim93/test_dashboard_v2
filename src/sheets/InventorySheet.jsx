import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ReferenceLine, LabelList
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const DIV_COLORS = { AP: "#051C2C", FW: "#00A9CE", EQ: "#7A8694" };
const PIE_COLORS = ["#051C2C", "#00A9CE", "#3D5A6C", "#7A8694", "#A8B0B8", "#C5CCD3"];
const STORAGE_OPTS = ["Total", "HighBay", "INFINITY", "Pickface"];
const METRIC_OPTS = [
  { id: "Unit", label: "by Unit" },
  { id: "Carton", label: "by Carton" },
  { id: "SKU", label: "by SKU Count" }
];

/** Storage capacity by metric · used as dashed reference lines on Daily chart */
const STORAGE_CAPACITY = {
  Unit: {
    Total: 7130000,
    HighBay: 4000000,
    INFINITY: 1830000,
    Pickface: 1300000
  },
  Carton: {
    Total: 542000,
    HighBay: 372000,
    INFINITY: 170000
  }
};

const CAPACITY_LINE_COLORS = {
  Total: "#E67E22",
  HighBay: "#E67E22",
  INFINITY: "#F39C12",
  Pickface: "#D35400"
};

function getCapacityLines(storage, metric) {
  if (metric === "SKU") return [];
  const table = STORAGE_CAPACITY[metric === "Carton" ? "Carton" : "Unit"] || {};
  const unit = metric === "Carton" ? "Cartons" : "Units";
  if (table[storage] == null) return [];
  return [
    {
      name: storage,
      value: table[storage],
      color: CAPACITY_LINE_COLORS[storage] || "#E67E22",
      label: storage + " Cap " + Number(table[storage]).toLocaleString("en-US") + " " + unit
    }
  ];
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return "-";
  return Number(n).toLocaleString("en-US");
}

function fmtDate(yyyymmdd) {
  const s = String(yyyymmdd || "");
  if (s.length !== 8) return s;
  return s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8);
}

function metricKey(metric) {
  if (metric === "Carton") return "cartons";
  if (metric === "SKU") return "skus";
  return "units";
}

function totalKey(metric) {
  if (metric === "Carton") return "totalCartons";
  if (metric === "SKU") return "totalSkus";
  return "totalUnits";
}

function Slicer({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-section text-mck-gray">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const id = typeof opt === "string" ? opt : opt.id;
          const labelText = typeof opt === "string" ? opt : opt.label;
          return (
            <button
              key={id}
              type="button"
              className={"slicer-btn " + (value === id ? "active" : "")}
              onClick={() => onChange(id)}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KpiCell({ title, value, hint }) {
  return (
    <div className="border-r border-mck-line px-4 py-3 last:border-r-0 md:px-5">
      <div className="text-[11px] font-semibold uppercase tracking-section text-mck-gray">{title}</div>
      <div className="kpi-num mt-2 font-serif text-[28px] font-semibold leading-none text-mck-navy md:text-[32px]">{value}</div>
      {hint ? <div className="mt-1.5 text-xs text-mck-gray">{hint}</div> : null}
    </div>
  );
}

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="border border-mck-line bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1.5 font-semibold text-mck-navy">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-8 py-0.5">
          <span className="flex items-center gap-2 text-mck-gray">
            <span className="inline-block h-2 w-2" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="kpi-num font-medium text-mck-navy">{fmt(p.value)}</span>
        </div>
      ))}
      <div className="mt-1.5 border-t border-mck-line pt-1.5 font-semibold text-mck-navy">
        Total {fmt(total)} {metric === "Carton" ? "LPN" : metric === "SKU" ? "SKUs" : "Units"}
      </div>
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="border border-mck-line bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold text-mck-navy">{p.name}</div>
      <div className="kpi-num text-mck-gray">{fmt(p.value)} Units ({(p.payload.pct || 0).toFixed(1)}%)</div>
    </div>
  );
}

function SectionHead({ number, title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-mck-line pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-section text-mck-teal">{number}</span>
          <div className="mck-rule" />
        </div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-mck-navy md:text-[28px]">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-mck-gray">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function fmtUpc(n) {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function unitPerCarton(bucket) {
  if (!bucket || !bucket.cartons) return null;
  return bucket.units / bucket.cartons;
}

function HbUpcPanel({ highBay, asOf }) {
  const rows = [
    { key: "FW", label: "FW", hint: "Division 20", color: DIV_COLORS.FW },
    { key: "AP", label: "AP", hint: "Division 10", color: DIV_COLORS.AP },
    { key: "EQ", label: "EQ", hint: "Division 30", color: DIV_COLORS.EQ }
  ].map((r) => {
    const bucket = highBay ? highBay[r.key] : null;
    const upc = unitPerCarton(bucket);
    return {
      ...r,
      upc,
      units: bucket ? bucket.units : 0,
      cartons: bucket ? bucket.cartons : 0
    };
  });
  const maxUpc = Math.max(...rows.map((r) => r.upc || 0), 0.0001);
  const overall = highBay ? unitPerCarton({
    units: highBay.totalUnits,
    cartons: highBay.totalCartons
  }) : null;

  return (
    <section className="mck-panel mb-8 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-mck-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-section text-mck-teal">02</span>
            <div className="mck-rule" />
          </div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-mck-navy md:text-[28px]">
            HB Unit per Carton
          </h2>
          <p className="mt-1 text-sm text-mck-gray">
            HighBay density by division · Units / LPN count{asOf ? " · as of " + asOf : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-section text-mck-gray">HighBay overall</div>
          <div className="kpi-num font-serif text-2xl font-semibold text-mck-navy">{fmtUpc(overall)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {rows.map((r) => {
          const widthPct = Math.round(((r.upc || 0) / maxUpc) * 100);
          return (
            <div key={r.key} className="border border-mck-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: r.color }} />
                  <span className="text-sm font-semibold text-mck-navy">{r.label}</span>
                </div>
                <span className="text-[11px] text-mck-gray">{r.hint}</span>
              </div>
              <div className="kpi-num mt-3 font-serif text-[40px] font-semibold leading-none text-mck-navy">
                {fmtUpc(r.upc)}
              </div>
              <div className="mt-1 text-xs text-mck-gray">units / carton</div>
              <div className="mt-4 h-1.5 w-full bg-mck-soft">
                <div className="h-1.5" style={{ width: widthPct + "%", background: r.color }} />
              </div>
              <div className="mt-3 flex justify-between gap-3 text-[11px] text-mck-gray">
                <span>{fmt(r.units)} units</span>
                <span>{fmt(r.cartons)} LPN</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const DASHBOARD_TITLE = "1088 Inventory Status Dashboard";

const SLICER_COMBOS = [
  { storage: "Total", metric: "Unit", label: "Total · by Unit" },
  { storage: "Total", metric: "Carton", label: "Total · by Carton" },
  { storage: "Total", metric: "SKU", label: "Total · by SKU Count" },
  { storage: "HighBay", metric: "Unit", label: "HighBay · by Unit" },
  { storage: "HighBay", metric: "Carton", label: "HighBay · by Carton" },
  { storage: "HighBay", metric: "SKU", label: "HighBay · by SKU Count" },
  { storage: "INFINITY", metric: "Unit", label: "INFINITY · by Unit" },
  { storage: "INFINITY", metric: "Carton", label: "INFINITY · by Carton" },
  { storage: "INFINITY", metric: "SKU", label: "INFINITY · by SKU Count" },
  { storage: "Pickface", metric: "Unit", label: "Pickface · by Unit" },
  { storage: "Pickface", metric: "SKU", label: "Pickface · by SKU Count" }
];

function comboKey(storage, metric) {
  return storage + "|" + metric;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureNode(node) {
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#FFFFFF",
    logging: false,
    windowWidth: Math.max(node.scrollWidth, 1280)
  });
}

async function downloadInteractivePdf(rootEl, meta) {
  if (!html2canvas || !jsPDF) {
    throw new Error("PDF libraries failed to load");
  }
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;
  const asOf = meta.asOf || "";
  const fileStamp = meta.fileStamp || "";
  const setView = meta.setView;
  const onProgress = meta.onProgress || function () {};

  const pageStarts = {};
  const comboPages = {};

  pdf.setFillColor(5, 28, 44);
  pdf.rect(0, 0, pageW, pageH, "F");

  function addFooter(title) {
    pdf.setFontSize(8);
    pdf.setTextColor(83, 86, 90);
    pdf.text(title, margin, pageH - 4);
    pdf.setTextColor(0, 169, 206);
    pdf.textWithLink("Contents", pageW - margin - 22, pageH - 4, { pageNumber: 1 });
    pdf.link(pageW - margin - 24, pageH - 8, 24, 6, { pageNumber: 1 });
  }

  function drawSlicerBar(activeStorage, activeMetric) {
    const barY = margin;
    const btnH = 7;
    let x = margin;
    pdf.setFontSize(7);
    pdf.setTextColor(83, 86, 90);
    pdf.text("STORAGE", x, barY + 5);
    x += 18;

    STORAGE_OPTS.forEach((s) => {
      const w = Math.max(16, s.length * 2.2 + 6);
      const active = s === activeStorage;
      pdf.setDrawColor(5, 28, 44);
      if (active) {
        pdf.setFillColor(5, 28, 44);
        pdf.rect(x, barY, w, btnH, "FD");
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x, barY, w, btnH, "FD");
        pdf.setTextColor(5, 28, 44);
      }
      pdf.setFontSize(7);
      pdf.text(s, x + 2, barY + 4.8);
      const preferMetric = s === "Pickface" && activeMetric === "Carton" ? "Unit" : activeMetric;
      const page = comboPages[comboKey(s, preferMetric)];
      if (page) pdf.link(x, barY, w, btnH, { pageNumber: page });
      x += w + 2;
    });

    x += 6;
    pdf.setTextColor(83, 86, 90);
    pdf.text("METRIC", x, barY + 5);
    x += 16;

    const metrics =
      activeStorage === "Pickface"
        ? [
            { id: "Unit", label: "by Unit" },
            { id: "SKU", label: "by SKU Count" }
          ]
        : [
            { id: "Unit", label: "by Unit" },
            { id: "Carton", label: "by Carton" },
            { id: "SKU", label: "by SKU Count" }
          ];

    metrics.forEach((m) => {
      const w = Math.max(18, m.label.length * 2.1 + 6);
      const active = m.id === activeMetric;
      pdf.setDrawColor(5, 28, 44);
      if (active) {
        pdf.setFillColor(0, 169, 206);
        pdf.setDrawColor(0, 169, 206);
        pdf.rect(x, barY, w, btnH, "FD");
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x, barY, w, btnH, "FD");
        pdf.setTextColor(5, 28, 44);
      }
      pdf.setFontSize(7);
      pdf.text(m.label, x + 2, barY + 4.8);
      const page = comboPages[comboKey(activeStorage, m.id)];
      if (page) pdf.link(x, barY, w, btnH, { pageNumber: page });
      x += w + 2;
    });

    return barY + btnH + 3;
  }

  function addFittedImage(canvas, topY, title) {
    const availH = pageH - topY - margin - 6;
    const scale = Math.min(contentW / canvas.width, availH / canvas.height);
    const drawW = canvas.width * scale;
    const drawH = canvas.height * scale;
    const x = margin + (contentW - drawW) / 2;
    const y = topY + Math.max(0, (availH - drawH) / 2);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, y, drawW, drawH);
    addFooter(title);
  }

  document.body.classList.add("pdf-exporting");
  try {
    onProgress("Capturing Daily inventory slicer views...");
    for (let i = 0; i < SLICER_COMBOS.length; i++) {
      const combo = SLICER_COMBOS[i];
      onProgress("Capturing 01 · " + combo.label + " (" + (i + 1) + "/" + SLICER_COMBOS.length + ")");
      if (setView) await setView(combo.storage, combo.metric);
      await sleep(600);
      const el = rootEl.querySelector("#pdf-section-01");
      if (!el) continue;
      const canvas = await captureNode(el);
      pdf.addPage();
      const pageNo = pdf.internal.getNumberOfPages();
      comboPages[comboKey(combo.storage, combo.metric)] = pageNo;
      if (i === 0) pageStarts["pdf-section-01"] = pageNo;
      // Reserve space for interactive slicer bar (drawn after all page numbers are known)
      addFittedImage(canvas, margin + 11, "01  Daily inventory · " + combo.label);
    }

    // Draw clickable STORAGE / METRIC slicers on every section-01 page
    SLICER_COMBOS.forEach((combo) => {
      const pageNo = comboPages[comboKey(combo.storage, combo.metric)];
      if (!pageNo) return;
      pdf.setPage(pageNo);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin - 1, margin - 1, contentW + 2, 12, "F");
      drawSlicerBar(combo.storage, combo.metric);
    });

    const otherSections = [
      { id: "pdf-section-02", title: "02  HB Unit per Carton" },
      { id: "pdf-section-03", title: "03  Season mix" },
      { id: "pdf-section-04", title: "04  Life cycle" }
    ];

    for (let i = 0; i < otherSections.length; i++) {
      const sec = otherSections[i];
      onProgress("Capturing " + sec.title + "...");
      await sleep(250);
      const el = rootEl.querySelector("#" + sec.id);
      if (!el) continue;
      const canvas = await captureNode(el);
      pdf.addPage();
      pageStarts[sec.id] = pdf.internal.getNumberOfPages();
      const availH = pageH - margin * 2 - 6;
      const scale = Math.min(contentW / canvas.width, availH / canvas.height);
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const x = margin + (contentW - drawW) / 2;
      const y = margin + Math.max(0, (availH - drawH) / 2);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, y, drawW, drawH);
      addFooter(sec.title);
    }

    if (meta.restoreView) await meta.restoreView();
  } finally {
    document.body.classList.remove("pdf-exporting");
  }

  pdf.setPage(1);
  pdf.setFillColor(5, 28, 44);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.setFillColor(0, 169, 206);
  pdf.rect(margin, 24, 18, 1.2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("EXECUTIVE DASHBOARD", margin, 36);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(pdf.splitTextToSize(DASHBOARD_TITLE, pageW - margin * 2), margin, 50);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(200, 210, 220);
  pdf.text("Data as of  " + asOf, margin, 66);
  pdf.text("Interactive PDF  ·  Click STORAGE / METRIC buttons on section 01 pages", margin, 74);

  let tocY = 90;
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Contents", margin, tocY);
  tocY += 6;
  pdf.setFillColor(0, 169, 206);
  pdf.rect(margin, tocY, 12, 0.6, "F");
  tocY += 10;

  const tocMain = [
    { title: "01  Daily inventory by storage", page: pageStarts["pdf-section-01"] || 2 },
    { title: "02  HB Unit per Carton", page: pageStarts["pdf-section-02"] || 2 },
    { title: "03  Season mix", page: pageStarts["pdf-section-03"] || 2 },
    { title: "04  Life cycle", page: pageStarts["pdf-section-04"] || 2 }
  ];

  if (pdf.outline && typeof pdf.outline.add === "function") {
    try {
      pdf.outline.add(null, DASHBOARD_TITLE, { pageNumber: 1 });
    } catch (e) {}
  }

  tocMain.forEach((item) => {
    pdf.setFontSize(11);
    pdf.setTextColor(0, 169, 206);
    pdf.textWithLink(item.title, margin, tocY, { pageNumber: item.page });
    pdf.link(margin, tocY - 4, 150, 7, { pageNumber: item.page });
    pdf.setTextColor(160, 170, 180);
    pdf.text(String(item.page), pageW - margin - 8, tocY, { align: "right" });
    if (pdf.outline && typeof pdf.outline.add === "function") {
      try {
        pdf.outline.add(null, item.title, { pageNumber: item.page });
      } catch (e) {}
    }
    tocY += 9;
  });

  tocY += 4;
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text("01 Slicer views (click to open)", margin, tocY);
  tocY += 7;

  SLICER_COMBOS.forEach((combo) => {
    const page = comboPages[comboKey(combo.storage, combo.metric)];
    if (!page) return;
    pdf.setFontSize(9);
    pdf.setTextColor(0, 169, 206);
    pdf.textWithLink("   -  " + combo.label, margin, tocY, { pageNumber: page });
    pdf.link(margin, tocY - 3.5, 120, 5, { pageNumber: page });
    pdf.setTextColor(160, 170, 180);
    pdf.text(String(page), pageW - margin - 8, tocY, { align: "right" });
    if (pdf.outline && typeof pdf.outline.add === "function") {
      try {
        pdf.outline.add(null, "01 - " + combo.label, { pageNumber: page });
      } catch (e) {}
    }
    tocY += 6.5;
  });

  pdf.setFontSize(8);
  pdf.setTextColor(160, 170, 180);
  pdf.text("Generated " + new Date().toLocaleString() + "  ·  Confidential", margin, pageH - 10);

  pdf.save("1088_Inventory_Status_Dashboard_" + (fileStamp || "export") + ".pdf");
}

export function InventorySheet() {
  const [data, setData] = useState(() => window.__INVENTORY_DATA__ || null);
  const [storage, setStorage] = useState("Total");
  const [metric, setMetric] = useState("Unit");
  const [status, setStatus] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileRef = useRef(null);
  const exportRef = useRef(null);

  const metricOpts = useMemo(() => {
    if (storage === "Pickface") return METRIC_OPTS.filter((m) => m.id === "Unit" || m.id === "SKU");
    return METRIC_OPTS;
  }, [storage]);

  useEffect(() => {
    if (data) return;
    fetch(`${import.meta.env.BASE_URL}data/inventory.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setData(j))
      .catch(() => setStatus("Data file missing. Use Update Data to upload inventory.json."));
  }, [data]);

  useEffect(() => {
    if (storage === "Pickface" && metric === "Carton") setMetric("Unit");
  }, [storage, metric]);

  function onStorageChange(next) {
    setStorage(next);
    if (next === "Pickface" && metric === "Carton") setMetric("Unit");
  }

  const mk = metricKey(metric);
  const tk = totalKey(metric);

  const capacityLines = useMemo(() => getCapacityLines(storage, metric), [storage, metric]);
  const activeCapacity = capacityLines.length ? capacityLines[0].value : null;

  const dailyChart = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d) => {
      const s = d.storages[storage];
      const total = s[tk];
      const capacityPct =
        activeCapacity && activeCapacity > 0 ? (total / activeCapacity) * 100 : null;
      return {
        date: fmtDate(d.date),
        AP: s.AP[mk],
        FW: s.FW[mk],
        EQ: s.EQ[mk],
        total,
        capacityPct
      };
    });
  }, [data, storage, mk, tk, activeCapacity]);

  const latestHighBay = useMemo(() => {
    if (!data || !data.daily.length) return null;
    return data.daily[data.daily.length - 1].storages.HighBay;
  }, [data]);

  const latestStorage = useMemo(() => {
    if (!data || !data.daily.length) return null;
    return data.daily[data.daily.length - 1].storages[storage];
  }, [data, storage]);

  const seasonData = useMemo(() => {
    if (!data) return [];
    const total = data.season.total || 1;
    return data.season.items.map((it) => ({
      ...it,
      pct: (it.value / total) * 100
    }));
  }, [data]);

  const lifeCycleData = useMemo(() => {
    if (!data) return [];
    return data.lifeCycle.categories.map((c) => ({
      name: c.name.replace(" (Inline)", "").replace(" (Close-out)", ""),
      fullName: c.name,
      AP: c.AP,
      FW: c.FW,
      EQ: c.EQ,
      total: c.total
    }));
  }, [data]);

  async function onDownloadPdf() {
    if (!exportRef.current || pdfBusy) return;
    const prevStorage = storage;
    const prevMetric = metric;
    setPdfBusy(true);
    setStatus("Generating interactive PDF...");
    try {
      const asOf = data.latestDateLabel || fmtDate(data.latestDate);
      await downloadInteractivePdf(exportRef.current, {
        asOf,
        fileStamp: String(data.latestDate || "").replace(/\D/g, "") || "export",
        onProgress: (msg) => setStatus(msg),
        setView: async (s, m) => {
          setStorage(s);
          setMetric(m);
          await sleep(50);
        },
        restoreView: async () => {
          setStorage(prevStorage);
          setMetric(prevMetric);
          await sleep(300);
        }
      });
      setStatus("PDF downloaded. Section 01 slicers are clickable in the PDF.");
    } catch (err) {
      setStorage(prevStorage);
      setMetric(prevMetric);
      setStatus("PDF export failed: " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setPdfBusy(false);
    }
  }

  function onUpdateClick() {
    fileRef.current && fileRef.current.click();
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setStatus("Loading " + file.name + "...");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (!json.daily || !json.season || !json.lifeCycle) {
          throw new Error("Invalid inventory JSON structure");
        }
        setData(json);
        window.__INVENTORY_DATA__ = json;
        setStatus("Updated · " + (json.latestDateLabel || fmtDate(json.latestDate)));
      } catch (err) {
        setStatus("Update failed: upload inventory.json (run Update Data.bat for Query xlsx).");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
        <div className="mck-rule mb-4" />
        <h1 className="font-serif text-3xl font-semibold text-mck-navy">{DASHBOARD_TITLE}</h1>
        <p className="mt-3 text-sm text-mck-gray">{status || "Loading..."}</p>
        <button type="button" onClick={onUpdateClick} className="mt-6 w-fit bg-mck-navy px-4 py-2 text-sm font-semibold text-white">
          Update Data
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFileChange} />
      </div>
    );
  }

  const unitLabel = metric === "Carton" ? "LPN / Carton" : metric === "SKU" ? "SKU Count" : "Units";

  return (
    <div className="min-h-screen bg-white" ref={exportRef}>
      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-mck-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="mck-rule" />
              <span className="text-[11px] font-semibold uppercase tracking-section text-mck-teal">Executive Dashboard</span>
            </div>
            <h1 className="font-serif text-[30px] font-semibold leading-tight text-mck-navy md:text-[40px]">
              {DASHBOARD_TITLE}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mck-gray md:text-[15px]">
              Daily stock by storage zone, season mix, and life-cycle posture across HighBay, INFINITY, and Pickface.
            </p>
          </div>
          <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="mck-panel px-4 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-section text-mck-gray">Data as of</div>
              <div className="kpi-num mt-0.5 text-sm font-semibold text-mck-navy">{data.latestDateLabel || fmtDate(data.latestDate)}</div>
            </div>
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={pdfBusy}
              className="border border-mck-navy bg-white px-4 py-2.5 text-sm font-semibold text-mck-navy hover:bg-mck-mist disabled:opacity-60"
            >
              {pdfBusy ? "Preparing PDF..." : "Download Interactive PDF"}
            </button>
            <button
              type="button"
              onClick={onUpdateClick}
              className="bg-mck-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-mck-tealDeep"
            >
              Update Data
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFileChange} />
          </div>
        </header>

        {status ? <div className="mb-4 text-sm text-mck-tealDeep">{status}</div> : null}
        <div className="mb-6 text-xs text-mck-gray">
          Source {data.sourceFile || "inventory.json"} · {fmt(data.recordCount)} records · Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : "-"}
        </div>

        <div id="pdf-section-01">
        <section className="mck-panel mb-8 grid grid-cols-2 xl:grid-cols-4">
          <KpiCell title={"Latest " + unitLabel} value={fmt(latestStorage ? latestStorage[tk] : 0)} hint={storage + " · " + (metricOpts.find((m) => m.id === metric)?.label || metric)} />
          <KpiCell title="AP" value={fmt(latestStorage ? latestStorage.AP[mk] : 0)} hint="Division 10" />
          <KpiCell title="FW" value={fmt(latestStorage ? latestStorage.FW[mk] : 0)} hint="Division 20" />
          <KpiCell title="EQ" value={fmt(latestStorage ? latestStorage.EQ[mk] : 0)} hint="Division 30" />
        </section>

        <section className="mck-panel mb-8 p-5 md:p-6">
          <SectionHead
            number="01"
            title="Daily inventory by storage"
            subtitle="Stacked division view (AP / FW / EQ). Orange dashed line = Storage Capacity. Bar labels = total vs capacity %."
            right={
              <div className="pdf-slicer-host flex flex-col gap-3">
                <Slicer label="Storage" options={STORAGE_OPTS} value={storage} onChange={onStorageChange} />
                <Slicer label="Metric" options={metricOpts} value={metric} onChange={setMetric} />
              </div>
            }
          />
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#53565A", fontSize: 11 }} axisLine={{ stroke: "#D9DDE3" }} tickLine={false} />
                <YAxis tick={{ fill: "#53565A", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v)} />
                <Tooltip content={<ChartTooltip metric={metric} />} cursor={{ fill: "rgba(0,169,206,0.06)" }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: "#53565A" }} />
                <Bar dataKey="AP" name="AP" stackId="a" fill={DIV_COLORS.AP} maxBarSize={42} />
                <Bar dataKey="FW" name="FW" stackId="a" fill={DIV_COLORS.FW} maxBarSize={42} />
                <Bar dataKey="EQ" name="EQ" stackId="a" fill={DIV_COLORS.EQ} maxBarSize={42}>
                  <LabelList
                    dataKey="capacityPct"
                    position="top"
                    formatter={(v) => (v == null || Number.isNaN(v) ? "" : Number(v).toFixed(1) + "%")}
                    style={{ fill: "#E67E22", fontSize: 10, fontWeight: 700 }}
                  />
                </Bar>
                {capacityLines.map((line) => (
                  <ReferenceLine
                    key={line.name}
                    y={line.value}
                    stroke={line.color}
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    ifOverflow="extendDomain"
                    label={{
                      value: line.label,
                      position: "insideTopRight",
                      fill: line.color,
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        </div>

        <div id="pdf-section-02">
        <HbUpcPanel highBay={latestHighBay} asOf={data.latestDateLabel || fmtDate(data.latestDate)} />
        </div>

        <div className="pdf-bottom-grid grid gap-8 lg:grid-cols-2">
          <section id="pdf-section-03" className="mck-panel p-5 md:p-6">
            <SectionHead
              number="03"
              title="Season mix"
              subtitle={"Latest file (" + (data.season.date ? fmtDate(data.season.date) : data.latestDateLabel) + "). Shares below 1% consolidated as Others."}
            />
            <div className="pdf-chart-sm h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={seasonData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={1} stroke="#fff" strokeWidth={2}>
                    {seasonData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.name === "Others" ? "#A8B0B8" : PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: "#53565A" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px bg-mck-line md:grid-cols-3">
              {seasonData.map((s) => (
                <div key={s.name} className="bg-white px-3 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-mck-gray">{s.name}</div>
                  <div className="kpi-num mt-1 text-sm font-semibold text-mck-navy">{fmt(s.value)}</div>
                  <div className="text-xs text-mck-gray">{s.pct.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </section>

          <section id="pdf-section-04" className="mck-panel p-5 md:p-6">
            <SectionHead
              number="04"
              title="Life cycle"
              subtitle="Latest file · Units by division (AP / FW / EQ)."
            />
            <div className="pdf-chart-sm h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifeCycleData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#53565A", fontSize: 11 }} axisLine={{ stroke: "#D9DDE3" }} tickLine={false} />
                  <YAxis tick={{ fill: "#53565A", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v)} />
                  <Tooltip content={<ChartTooltip metric="Unit" />} cursor={{ fill: "rgba(0,169,206,0.06)" }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: "#53565A" }} />
                  <Bar dataKey="AP" name="AP" stackId="a" fill={DIV_COLORS.AP} maxBarSize={72} />
                  <Bar dataKey="FW" name="FW" stackId="a" fill={DIV_COLORS.FW} maxBarSize={72} />
                  <Bar dataKey="EQ" name="EQ" stackId="a" fill={DIV_COLORS.EQ} maxBarSize={72} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px bg-mck-line">
              {lifeCycleData.map((c) => (
                <div key={c.fullName} className="bg-white px-3 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-mck-gray">{c.fullName}</div>
                  <div className="kpi-num mt-1 text-sm font-semibold text-mck-navy">{fmt(c.total)} Units</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-10 border-t border-mck-line pt-4 text-[11px] leading-relaxed text-mck-gray">
          Zone map: 30 HighBay · 81/82/83 INFINITY · 02/04/05/06/08 Pickface &nbsp;|&nbsp; Division: 10 AP · 20 FW · 30 EQ
        </footer>
      </div>
    </div>
  );
}

