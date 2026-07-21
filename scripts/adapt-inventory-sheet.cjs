/**
 * One-shot: adapt Inventory Flow dashboard.jsx into Hub InventorySheet.jsx
 * Does not modify the original Inventory Flow_Dashboard project.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(
  "C:/Users/nkim60/Inventory Flow_Dashboard/dashboard.jsx"
);
const out = path.join(__dirname, "../src/sheets/InventorySheet.jsx");

let s = fs.readFileSync(src, "utf8");

const header = `import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ReferenceLine, LabelList
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

`;

s = s.replace(/^const \{ useMemo, useState, useRef, useEffect \} = React;\r?\n/, "");
s = s.replace(/^const \{[\s\S]*?\} = Recharts;\r?\n\r?\n/, "");

s = s.replace(/window\.html2canvas/g, "html2canvas");
s = s.replace(
  /!window\.html2canvas \|\| !window\.jspdf \|\| !window\.jspdf\.jsPDF/,
  "!html2canvas || !jsPDF"
);
s = s.replace(/const \{ jsPDF \} = window\.jspdf;\r?\n\s*/g, "");
s = s.replace(/window\.jspdf\.jsPDF/g, "jsPDF");

s = s.replace('fetch("./data/inventory.json")', 'fetch("/data/inventory.json")');

// Remove standalone navy top bar (Hub chrome)
s = s.replace(
  /\s*<div className="border-b border-mck-navy bg-mck-navy">[\s\S]*?<\/div>\s*<\/div>\s*\n(\s*<div className="mx-auto max-w-\[1280px\])/,
  "\n$1"
);

s = s.replace(/function App\(\)/, "export function InventorySheet()");
s = s.replace(
  /\r?\nconst root = ReactDOM\.createRoot\(document\.getElementById\("root"\)\);\r?\nroot\.render\(<App \/>\);\s*$/,
  "\n"
);

// exportRef id for PDF — keep as is
fs.writeFileSync(out, header + s);
console.log("Wrote", out, fs.statSync(out).size);
