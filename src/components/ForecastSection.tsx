import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { stock, ForecastResponse } from "../api/client";
import { SectionHelp } from "./SectionHelp";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const HORIZONS = [
  { label: "1M", days: 21 },
  { label: "3M", days: 63 },
  { label: "6M", days: 126 },
  { label: "1Y", days: 252 },
];

const usd = (v: number) => `$${v.toFixed(2)}`;

/** Price-only probabilistic forecast. Independent of the fundamental scores. */
export function ForecastSection({ ticker }: { ticker: string }) {
  const [days, setDays] = useState(63);

  const q = useQuery<ForecastResponse, Error>({
    queryKey: ["forecast", ticker, days],
    queryFn: () => stock.forecast(ticker, days),
    staleTime: 24 * 60 * 60 * 1000, // EOD data
    retry: false,
    // Keep the previous horizon's chart on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const f = q.data?.ticker === ticker ? q.data : undefined;
  if (q.isError) return null; // optional section: stay quiet if history is too short

  const data = f && [
    { day: 0, r95: [f.last_price, f.last_price], r68: [f.last_price, f.last_price], median: f.last_price },
    ...f.bands.map((b) => ({
      day: b.day,
      r95: [b.lo95, b.hi95],
      r68: [b.lo68, b.hi68],
      median: b.median,
    })),
  ];
  const end = f?.bands[f.bands.length - 1];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-300">Price Range Forecast</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            Statistical range, not a prediction of direction
          </p>
        </div>
        <SectionHelp title="Price Range Forecast">
          <p>
            A volatility-based range for the price, separate from the fundamental analysis. The
            shaded bands are where the price should land about 68% and 95% of the time, using the
            stock's recent volatility (an exponentially weighted average that reacts to calm and
            turbulent periods).
          </p>
          <p>
            It says nothing about whether the price goes up or down. Strong trends can push the
            price outside the bands more often than shown.
          </p>
          <p>
            <span className="text-white font-medium">Backtest</span> — how often past forecasts
            made with only the data available at the time contained the real outcome. Close to 68%
            and 95% means the bands are well calibrated for this stock.
          </p>
        </SectionHelp>
      </div>

      <div className="flex gap-1 mb-3">
        {HORIZONS.map((h) => (
          <button
            key={h.label}
            onClick={() => setDays(h.days)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              days === h.days
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      {!f || !data || !end ? (
        <div className="h-[200px] animate-pulse bg-gray-800/40 rounded-lg flex items-center justify-center">
          <span className="text-xs text-gray-600">Calculating forecast…</span>
        </div>
      ) : (
        <div className="relative">
          {/* Indeterminate progress bar while a new horizon loads */}
          {q.isFetching && (
            <div className="absolute -top-2 left-0 right-0 h-0.5 bg-gray-800 overflow-hidden rounded">
              <div className="h-full w-1/3 bg-emerald-400 animate-[forecast-slide_1.1s_ease-in-out_infinite]" />
            </div>
          )}
          <div className={`transition-opacity ${q.isFetching ? "opacity-50" : ""}`}>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d) => `+${d}d`}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                }}
                labelFormatter={(d) => `+${d} trading days`}
                formatter={(v: unknown, name) => {
                  const label = name === "r95" ? "95% range" : name === "r68" ? "68% range" : "Median";
                  return [
                    Array.isArray(v) ? `${usd(v[0])} – ${usd(v[1])}` : usd(Number(v)),
                    label,
                  ];
                }}
              />
              <Area dataKey="r95" stroke="none" fill="#34d399" fillOpacity={0.12} isAnimationActive={false} />
              <Area dataKey="r68" stroke="none" fill="#34d399" fillOpacity={0.25} isAnimationActive={false} />
              <Line dataKey="median" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <p className="text-gray-500">68% range in {f.horizon_days} trading days</p>
              <p className="text-white font-medium">
                {usd(end.lo68)} – {usd(end.hi68)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">95% range</p>
              <p className="text-white font-medium">
                {usd(end.lo95)} – {usd(end.hi95)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            Volatility {(f.annual_vol * 100).toFixed(0)}% annualised
            {f.backtest &&
              ` · Backtest (${f.backtest.samples} windows): ${(f.backtest.coverage68 * 100).toFixed(0)}% / ${(
                f.backtest.coverage95 * 100
              ).toFixed(0)}% inside the 68% / 95% bands`}
          </p>
          </div>
        </div>
      )}
    </div>
  );
}
