import React from "react";

export default function PriceHistorySparkline({ history = [], valueKey = "price", stroke = "#c9a64b" }) {
  const points = (Array.isArray(history) ? history : [])
    .filter(item => Number.isFinite(Number(item?.[valueKey])) && Number(item[valueKey]) > 0);
  if (points.length < 2) {
    return <p className="mt-2 text-[10px] text-white/35">Price history will appear as more observations become available.</p>;
  }
  const values = points.map(item => Number(item[valueKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || Math.max(Math.abs(max) * 0.05, 1);
  const coords = values.map((value, index) => {
    const x = 3 + (index / (values.length - 1)) * 94;
    const y = 27 - ((value - min) / spread) * 22;
    return `${x},${y}`;
  }).join(" ");
  const trend = values.at(-1) >= values[0] ? "increased" : "decreased";
  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Price history</span>
        <span className="text-[9px] text-white/35">{points.length} observations</span>
      </div>
      <svg viewBox="0 0 100 32" role="img" aria-label={`Price ${trend} across ${points.length} published observations`} className="mt-1 h-10 w-full overflow-visible">
        <polyline points={coords} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-white/35"><span>{points[0].date}</span><span>{points.at(-1).date}</span></div>
    </div>
  );
}
