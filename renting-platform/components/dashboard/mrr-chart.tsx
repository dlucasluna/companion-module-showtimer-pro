"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, formatMoneyCompact, formatMonthShort } from "@/lib/formatters";
import type { MrrPoint } from "@/lib/database/dashboard";

const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };
const SERIES = "#3987e5"; // single series, blue (dark-mode step)

function niceMax(value: number): number {
  if (value <= 0) return 100_00;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** MRR over the last 12 months — area + 2px line, crosshair tooltip, table fallback. */
export function MrrChart({ data }: { data: MrrPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(...data.map((d) => d.value)) * 1.1);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const { line, area } = useMemo(() => {
    const pts = data.map((d, i) => [x(i), y(d.value)] as const);
    const path = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const baseline = PAD.top + innerH;
    return { line: path, area: `${path} L${x(data.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, max]);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const hovered = hover !== null ? data[hover] : null;

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = (event.clientX - rect.left) / rect.width;
    setHover(Math.round(Math.min(1, Math.max(0, rel)) * (data.length - 1)));
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg width={width} height={HEIGHT} role="img" aria-label="Receita recorrente mensal, últimos 12 meses" className="block overflow-visible">
        <defs>
          <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SERIES} stopOpacity="0.28" />
            <stop offset="1" stopColor={SERIES} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="rgb(255 255 255 / 0.06)" />
            <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-3 text-[11px]">
              {formatMoneyCompact(tick)}
            </text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.month} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-fg-3 text-[11px] capitalize">
            {formatMonthShort(d.month)}
          </text>
        ))}
        <path d={area} fill="url(#mrr-fill)" />
        <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(hovered.value)} r={5} fill={SERIES} stroke="#0d0d10" strokeWidth={2} />
          </g>
        )}
        {!hovered && data.length > 0 && <circle cx={x(data.length - 1)} cy={y(data.at(-1)!.value)} r={4} fill={SERIES} stroke="#0d0d10" strokeWidth={2} />}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hovered && hover !== null && (
        <div
          className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl px-3 py-2 text-small"
          style={{ left: Math.min(width - 70, Math.max(70, x(hover))), top: Math.max(0, y(hovered.value) - 64) }}
        >
          <p className="capitalize text-fg-3">{new Date(hovered.month).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</p>
          <p className="num font-semibold text-fg">{formatMoney(hovered.value)}/mês</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Receita recorrente mensal</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">MRR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{formatMonthShort(d.month)}</td>
              <td>{formatMoney(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
