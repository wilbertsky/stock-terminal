import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, TrendingUp, Search as SearchIcon, Plus } from "lucide-react";
import { screenerApi, ScreenerEntry, SectorScreenerResponse } from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import { AddToPortfolioModal } from "../components/AddToPortfolioModal";
import { TickerTooltip } from "../components/TickerTooltip";

const SECTORS = [
  { id: "technology", label: "Technology" },
  { id: "healthcare", label: "Healthcare" },
  { id: "financials", label: "Financials" },
  { id: "energy", label: "Energy" },
  { id: "consumer-staples", label: "Consumer Staples" },
  { id: "consumer-discretionary", label: "Consumer Discretionary" },
  { id: "industrials", label: "Industrials" },
  { id: "materials", label: "Materials" },
  { id: "real-estate", label: "Real Estate" },
  { id: "communication", label: "Communication" },
  { id: "utilities", label: "Utilities" },
];

function tierStyle(tier: string) {
  switch (tier) {
    case "High":            return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "Above Average":  return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    case "Average":        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default:               return "text-gray-400 bg-gray-500/10 border-gray-500/30";
  }
}

function scoreColor(score: number) {
  if (score >= 65) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-xs text-gray-500 shrink-0 w-36 whitespace-nowrap">{label}</span>
      <span className="sm:hidden text-xs text-gray-500 shrink-0 w-16 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${scoreColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
        {Math.round(value)}
      </span>
    </div>
  );
}

function ScreenerCard({
  entry,
  rank,
  data,
}: {
  entry: ScreenerEntry;
  rank: number;
  data: SectorScreenerResponse;
}) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const labels = data.score_labels;

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
        {/* Top row: rank + ticker + composite (always visible) */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-400">#{rank}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CompanyLogo ticker={entry.ticker} size="sm" />
            <TickerTooltip ticker={entry.ticker}>
              <span className="text-white font-bold text-sm">{entry.ticker}</span>
            </TickerTooltip>
          </div>
          {/* Composite score — always right-aligned in top row */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${tierStyle(entry.score_tier)}`}
            >
              {entry.score_tier}
            </span>
            <div className="text-right">
              <div className="text-xl font-bold text-white tabular-nums leading-none">
                {entry.composite_score.toFixed(1)}
              </div>
              <div className="text-[10px] text-gray-500">composite</div>
            </div>
          </div>
        </div>

        {/* Score bars — full width on mobile, inline on desktop */}
        <div className="space-y-1.5 mb-3">
          <ScoreBar label={labels[0] ?? "Score A"} value={entry.score_a} />
          <ScoreBar label={labels[1] ?? "Score B"} value={entry.score_b} />
          <ScoreBar label={labels[2] ?? "Score C"} value={entry.score_c} />
          <ScoreBar label={labels[3] ?? "Score D"} value={entry.score_d} />
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
              <button
                onClick={() => navigate(`/search?ticker=${entry.ticker}`)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                title="Analyze"
              >
                <SearchIcon size={11} />
                Analyze
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                title="Add to portfolio"
              >
                <Plus size={11} />
                Portfolio
              </button>
            </div>
      </div>

      {showModal && (
        <AddToPortfolioModal ticker={entry.ticker} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

export function Screener() {
  const [sector, setSector] = useState(
    () => localStorage.getItem("lastSector") ?? "technology"
  );

  useEffect(() => {
    localStorage.setItem("lastSector", sector);
  }, [sector]);

  const q = useQuery({
    queryKey: ["screener", sector],
    queryFn: () => screenerApi.getSector(sector),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const sectorLabel = SECTORS.find((s) => s.id === sector)?.label ?? sector;

  const weightsLegend = q.data
    ? q.data.score_labels.map((l, i) => `${l} ${q.data!.score_weights[i]}`).join(" · ")
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Sector Screener</h2>
        </div>
        <p className="text-gray-500 text-sm">
          Top S&P 500 picks by sector, ranked by factor-based composite scores that adapt to each sector's characteristics.
        </p>
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTORS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSector(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sector === s.id
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {q.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={28} className="text-emerald-400 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium">Analyzing {sectorLabel}…</p>
            <p className="text-gray-500 text-sm mt-1">
              Scoring the top S&P 500 names by market cap in this sector.
              This takes 15–30 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {q.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {(q.error as Error).message}
        </div>
      )}

      {/* Results */}
      {q.data && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{q.data.stocks_analyzed}</span> stocks
              analyzed in{" "}
              <span className="text-white font-semibold">{sectorLabel}</span>
              {" "}·{" "}
              <span className="text-gray-500">{q.data.scoring_model} model</span>
            </p>
            {weightsLegend && (
              <p className="text-xs text-gray-600">Weights: {weightsLegend}</p>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {q.data.results.map((entry, i) => (
              <ScreenerCard key={entry.ticker} entry={entry} rank={i + 1} data={q.data!} />
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-600 border-t border-gray-800 pt-4">
            {q.data.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
