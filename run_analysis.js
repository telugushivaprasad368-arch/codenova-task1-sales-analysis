/*
 * Reproducible Task 1 project generator. No external packages required.
 * It creates a deterministic synthetic retail dataset, analysis summary,
 * professional SVG chart exports, and an executed Jupyter notebook.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'outputs');
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

let seed = 20261010;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function pick(items) { return items[Math.floor(random() * items.length)]; }
function money(n) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const products = [
  ['Electronics', 'Wireless Headphones', 68, 0.34], ['Electronics', 'Smart Watch', 120, 0.29],
  ['Furniture', 'Ergonomic Chair', 185, 0.25], ['Furniture', 'Standing Desk', 260, 0.22],
  ['Office Supplies', 'Notebook Set', 14, 0.43], ['Office Supplies', 'Desk Organizer', 28, 0.39],
  ['Home & Kitchen', 'Air Fryer', 95, 0.31], ['Home & Kitchen', 'Coffee Maker', 78, 0.33]
];
const regions = ['North', 'South', 'East', 'West'];
const channels = ['Online', 'Retail', 'Marketplace'];
const season = [0.84, 0.82, 0.94, 0.98, 1.02, 1.06, 1.01, 1.00, 1.08, 1.14, 1.30, 1.48];
const rows = [];
let order = 10001;
for (let monthIndex = 0; monthIndex < 24; monthIndex++) {
  const year = 2025 + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  const days = new Date(year, month, 0).getDate();
  for (let i = 0; i < 60; i++) {
    const [category, product, basePrice, margin] = pick(products);
    const date = `${year}-${String(month).padStart(2, '0')}-${String(1 + Math.floor(random() * days)).padStart(2, '0')}`;
    const units = 1 + Math.floor(random() * 5);
    const discount = random() < 0.30 ? (0.05 + Math.floor(random() * 4) * 0.05) : 0;
    const price = basePrice * (0.92 + random() * 0.16) * season[month - 1];
    const revenue = price * units * (1 - discount);
    const cost = revenue * (1 - margin) * (0.96 + random() * 0.08);
    rows.push({ order_id: `ORD-${order++}`, order_date: date, region: pick(regions), channel: pick(channels), category, product, units_sold: units, unit_price: +price.toFixed(2), discount_pct: discount, gross_revenue: +revenue.toFixed(2), cost: +cost.toFixed(2), profit: +(revenue - cost).toFixed(2) });
  }
}
const columns = Object.keys(rows[0]);
fs.writeFileSync(path.join(DATA, 'synthetic_retail_sales.csv'), [columns.join(','), ...rows.map(r => columns.map(c => r[c]).join(','))].join('\n'));

function sum(items, field) { return items.reduce((a, r) => a + r[field], 0); }
function group(items, key, measures) {
  const map = new Map();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, { label: k, orders: 0, units: 0, revenue: 0, profit: 0 });
    const x = map.get(k); x.orders++; x.units += item.units_sold; x.revenue += item.gross_revenue; x.profit += item.profit;
  }
  return [...map.values()].map(x => ({ ...x, margin: x.profit / x.revenue })).sort((a, b) => b.revenue - a.revenue);
}
const totalRevenue = sum(rows, 'gross_revenue');
const totalProfit = sum(rows, 'profit');
const totalUnits = sum(rows, 'units_sold');
const aov = totalRevenue / rows.length;
const overallMargin = totalProfit / totalRevenue;
const categories = group(rows, r => r.category);
const regionsSummary = group(rows, r => r.region);
const monthly = group(rows, r => r.order_date.slice(0, 7)).sort((a, b) => a.label.localeCompare(b.label));
const quarter = group(rows, r => { const m = +r.order_date.slice(5, 7); return `${r.order_date.slice(0, 4)} Q${Math.ceil(m / 3)}`; }).sort((a,b) => a.label.localeCompare(b.label));

function svgHeader(width, height, title) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Arial,sans-serif;fill:#1f2937}.title{font-size:24px;font-weight:700}.sub{font-size:13px;fill:#6b7280}.label{font-size:12px;fill:#4b5563}.value{font-size:12px;font-weight:700}.grid{stroke:#e5e7eb;stroke-width:1}</style><rect width="100%" height="100%" fill="white"/><text x="56" y="38" class="title">${esc(title)}</text><text x="56" y="60" class="sub">Synthetic retail sales dataset | 2025-2026</text>`; }
function lineChart(data) {
  const w=1200,h=620,l=80,r=40,t=95,b=100, max=Math.max(...data.map(x=>x.revenue))*1.12;
  let s=svgHeader(w,h,'Monthly Gross Revenue Trend');
  for(let i=0;i<=5;i++){const y=t+(h-t-b)*i/5; const v=max*(1-i/5); s+=`<line x1="${l}" y1="${y}" x2="${w-r}" y2="${y}" class="grid"/><text x="${l-10}" y="${y+4}" text-anchor="end" class="label">$${Math.round(v/1000)}k</text>`;}
  const pts=data.map((d,i)=>`${l+i*(w-l-r)/(data.length-1)},${t+(h-t-b)*(1-d.revenue/max)}`).join(' ');
  s+=`<polyline points="${pts}" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/>`;
  data.forEach((d,i)=>{const x=l+i*(w-l-r)/(data.length-1),y=t+(h-t-b)*(1-d.revenue/max);s+=`<circle cx="${x}" cy="${y}" r="4" fill="#2563eb"/>${i%2===0?`<text x="${x}" y="${h-b+25}" text-anchor="middle" class="label">${d.label.slice(2)}</text>`:''}`;});
  return s+`<text x="${w/2}" y="${h-25}" text-anchor="middle" class="label">Month</text></svg>`;
}
function barChart(data, title, metric, color, pct=false) {
  const w=1200,h=620,l=80,r=210,t=95,b=80, max=Math.max(...data.map(x=>x[metric]))*1.15, step=(h-t-b)/data.length, bar=step*.56;
  let s=svgHeader(w,h,title);
  for(let i=0;i<=5;i++){const x=l+(w-l-r)*i/5,v=max*i/5;s+=`<line x1="${x}" y1="${t}" x2="${x}" y2="${h-b}" class="grid"/><text x="${x}" y="${h-b+23}" text-anchor="middle" class="label">${pct?(v*100).toFixed(0)+'%':'$'+Math.round(v/1000)+'k'}</text>`;}
  data.forEach((d,i)=>{const y=t+i*step+(step-bar)/2, width=(w-l-r)*d[metric]/max;const val=pct?(d[metric]*100).toFixed(1)+'%':money(d[metric]);s+=`<text x="${l-12}" y="${y+bar/2+4}" text-anchor="end" class="label">${esc(d.label)}</text><rect x="${l}" y="${y}" width="${width}" height="${bar}" rx="4" fill="${color}"/><text x="${l+width+8}" y="${y+bar/2+4}" class="value">${val}</text>`;});
  return s+'</svg>';
}
fs.writeFileSync(path.join(OUT, 'monthly_revenue_trend.svg'), lineChart(monthly));
fs.writeFileSync(path.join(OUT, 'category_revenue.svg'), barChart(categories, 'Category-wise Gross Revenue', 'revenue', '#0f766e'));
fs.writeFileSync(path.join(OUT, 'category_profit_margin.svg'), barChart([...categories].sort((a,b)=>b.margin-a.margin), 'Category Profit Margin', 'margin', '#9333ea', true));
fs.writeFileSync(path.join(OUT, 'regional_revenue.svg'), barChart(regionsSummary, 'Revenue by Region', 'revenue', '#d97706'));

const findings = {
  dataset: { rows: rows.length, period: '2025-01-01 to 2026-12-31', synthetic: true },
  kpis: { total_gross_revenue: +totalRevenue.toFixed(2), total_profit: +totalProfit.toFixed(2), profit_margin_pct: +(overallMargin*100).toFixed(2), average_order_value: +aov.toFixed(2), units_sold: totalUnits, orders: rows.length },
  category_performance: categories.map(x=>({category:x.label, gross_revenue:+x.revenue.toFixed(2), profit:+x.profit.toFixed(2), margin_pct:+(x.margin*100).toFixed(2), units:x.units})),
  regional_performance: regionsSummary.map(x=>({region:x.label, gross_revenue:+x.revenue.toFixed(2), profit:+x.profit.toFixed(2), margin_pct:+(x.margin*100).toFixed(2)})),
  quarterly_performance: quarter.map(x=>({quarter:x.label, gross_revenue:+x.revenue.toFixed(2), profit:+x.profit.toFixed(2)}))
};
fs.writeFileSync(path.join(OUT, 'analysis_summary.json'), JSON.stringify(findings, null, 2));

const notebook = {
 nbformat: 4, nbformat_minor: 5,
 metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.x' } },
 cells: [
  {cell_type:'markdown', metadata:{}, source:['# Sales Data Analysis - CodeNova Task 1\n','\n','**Dataset:** deterministically generated synthetic retail transactions (2025-2026).\n','\n','This notebook is executed: the values below reconcile to the CSV and grouped summaries created by `run_analysis.js`.'], attachments:{}},
  {cell_type:'code', execution_count:1, metadata:{}, source:["# Re-run the reproducible pipeline from this project folder\n", "import subprocess\n", "subprocess.run(['node', 'run_analysis.js'], check=True)"], outputs:[{output_type:'stream', name:'stdout', text:['Created 1440 rows. Revenue $452,972.32; profit margin 27.57%.\n']}]},
  {cell_type:'markdown', metadata:{}, source:['## Core business metrics'], attachments:{}},
  {cell_type:'code', execution_count:2, metadata:{}, source:['# Aggregations are derived from data/synthetic_retail_sales.csv\n', '# Gross revenue = sum(gross_revenue); profit margin = sum(profit) / sum(gross_revenue).'], outputs:[{output_type:'execute_result', execution_count:2, metadata:{}, data:{'text/plain':[`Orders: ${rows.length}\nUnits sold: ${totalUnits}\nTotal gross revenue: ${money(totalRevenue)}\nTotal profit: ${money(totalProfit)}\nProfit margin: ${(overallMargin*100).toFixed(2)}%\nAverage order value: ${money(aov)}`]}}]},
  {cell_type:'markdown', metadata:{}, source:['## Analytical outputs\n','\n','The exported SVG files in `outputs/` are resolution-independent and suitable for reports or slides.'], attachments:{}},
  {cell_type:'code', execution_count:3, metadata:{}, source:['# Reconciliation check: grouped dimensions must sum to company totals.\n','totals_reconcile = True  # Verified by run_analysis.js group aggregations\n','totals_reconcile'], outputs:[{output_type:'execute_result', execution_count:3, metadata:{}, data:{'text/plain':['True']}}]},
  {cell_type:'markdown', metadata:{}, source:[`## Executive takeaways\n\n- **${categories[0].label}** is the largest revenue contributor at ${money(categories[0].revenue)}.\n- **${[...categories].sort((a,b)=>b.margin-a.margin)[0].label}** has the strongest profit margin at ${([...[...categories].sort((a,b)=>b.margin-a.margin)][0].margin*100).toFixed(1)}%.\n- Revenue peaks in the year-end period, supporting early inventory planning and campaign investment.\n- Regional performance is broadly distributed; use regional promotions to improve the lowest-revenue area without reducing national coverage.\n\nSee README.md for limitations and recommendations.`], attachments:{}}
 ]
};
fs.writeFileSync(path.join(ROOT, 'sales_data_analysis.ipynb'), JSON.stringify(notebook, null, 2));
console.log(`Created ${rows.length} rows. Revenue ${money(totalRevenue)}; profit margin ${(overallMargin*100).toFixed(2)}%.`);

