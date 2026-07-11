import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, TrendingUp, Search as SearchIcon, Plus, Compass, TriangleAlert } from "lucide-react";
import {
  screenerApi,
  discoveryApi,
  ScreenerEntry,
  SectorScreenerResponse,
  DiscoveryEntry,
} from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import { AddToPortfolioModal } from "../components/AddToPortfolioModal";
import { TickerTooltip } from "../components/TickerTooltip";

type Mode = "large-cap" | "discovery";
type Exchange = "us" | "lse";

const EXCHANGES: { id: Exchange; label: string; flag: string }[] = [
  { id: "us",  label: "US",  flag: "🇺🇸" },
  { id: "lse", label: "LSE", flag: "🇬🇧" },
];

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

function currencySymbol(currency: string): string {
  return currency === "GBP" ? "£" : "$";
}

function formatMarketCap(value: number, currency = "USD"): string {
  const sym = currencySymbol(currency);
  if (value >= 1e9) return `${sym}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${sym}${(value / 1e6).toFixed(0)}M`;
  return `${sym}${value.toLocaleString()}`;
}

/** Negative = trading below Graham Number, positive = above. Both are surfaced by
 * discovery (the formula tends to be conservative for asset-light businesses), so
 * this is informational coloring, not a "good/bad" judgment the way score colors are. */
function deviationStyle(pct: number): string {
  if (pct < -1) return "text-emerald-400";
  if (pct > 1) return "text-amber-400";
  return "text-gray-300";
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

function CardActions({
  ticker,
  onAddToPortfolio,
}: {
  ticker: string;
  onAddToPortfolio: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => navigate(`/search?ticker=${ticker}`)}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        title="Analyze"
      >
        <SearchIcon size={11} />
        Analyze
      </button>
      <button
        onClick={onAddToPortfolio}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
        title="Add to portfolio"
      >
        <Plus size={11} />
        Portfolio
      </button>
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

        <CardActions ticker={entry.ticker} onAddToPortfolio={() => setShowModal(true)} />
      </div>

      {showModal && (
        <AddToPortfolioModal ticker={entry.ticker} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  debt_to_equity: "Debt/Equity",
  gross_margin: "Gross Margin",
  return_on_equity: "Return on Equity",
};

function DiscoveryCard({ entry, rank, currency }: { entry: DiscoveryEntry; rank: number; currency: string }) {
  const [showModal, setShowModal] = useState(false);
  const deviation = entry.deviation_from_graham_number_pct;
  const deviationLabel =
    deviation < 0
      ? `${Math.abs(deviation).toFixed(1)}% below Graham Number`
      : deviation > 0
      ? `${deviation.toFixed(1)}% above Graham Number`
      : "at Graham Number";

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
        {/* Top row: rank + ticker + company name + market cap */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-400">#{rank}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CompanyLogo ticker={entry.ticker} size="sm" />
            <div className="min-w-0">
              <TickerTooltip ticker={entry.ticker}>
                <span className="text-white font-bold text-sm">{entry.ticker}</span>
              </TickerTooltip>
              <p className="text-[11px] text-gray-500 truncate">{entry.company_name}</p>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-sm font-semibold text-white tabular-nums leading-none">
              {formatMarketCap(entry.market_cap, currency)}
            </div>
            <div className="text-[10px] text-gray-500">market cap</div>
          </div>
        </div>

        {/* Price vs Graham Number */}
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-gray-800/50">
          <div>
            <div className="text-[10px] text-gray-500">price</div>
            <div className="text-sm font-semibold text-white tabular-nums">
              {currencySymbol(currency)}{entry.current_price.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500">Graham Number</div>
            <div className="text-sm font-semibold text-white tabular-nums">
              {currencySymbol(currency)}{entry.graham_number.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500">deviation</div>
            <div className={`text-sm font-semibold tabular-nums ${deviationStyle(deviation)}`}>
              {deviationLabel}
            </div>
          </div>
        </div>

        {/* Quality floor scores */}
        <div className="space-y-1.5 mb-3">
          <ScoreBar label="Quality" value={entry.quality_score} />
          <ScoreBar label="Debt Safety" value={entry.debt_safety_score} />
          <ScoreBar label="Piotroski (/9)" value={(entry.piotroski_score / 9) * 100} />
        </div>

        {entry.missing_data_fields.length > 0 && (
          <div
            className="flex items-start gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]"
            title="Scores above may be understated — this data wasn't reported by either of our sources, not necessarily a sign of weak fundamentals."
          >
            <TriangleAlert size={12} className="shrink-0 mt-0.5" />
            <span>
              Incomplete data ({entry.missing_data_fields.map((f) => MISSING_FIELD_LABELS[f] ?? f).join(", ")}) — scores above may be understated.
            </span>
          </div>
        )}

        <CardActions ticker={entry.ticker} onAddToPortfolio={() => setShowModal(true)} />
      </div>

      {showModal && (
        <AddToPortfolioModal ticker={entry.ticker} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

export function Screener() {
  const [exchange, setExchange] = useState<Exchange>(
    () => (localStorage.getItem("screenerExchange") as Exchange | null) ?? "us"
  );
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem("screenerMode") as Mode | null) ?? "large-cap"
  );
  const [sector, setSector] = useState(
    () => localStorage.getItem("lastSector") ?? "technology"
  );
  // Sector is required for discovery — screening across all sectors at once was tried
  // and dropped (see discoveryApi.get's comment in api/client.ts for why), so this
  // defaults to a real sector just like the large-cap screener's `sector` state does.
  const [discoverySector, setDiscoverySector] = useState(
    () => localStorage.getItem("lastDiscoverySector") ?? "technology"
  );

  useEffect(() => {
    localStorage.setItem("screenerExchange", exchange);
  }, [exchange]);

  useEffect(() => {
    localStorage.setItem("screenerMode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("lastSector", sector);
  }, [sector]);

  useEffect(() => {
    localStorage.setItem("lastDiscoverySector", discoverySector);
  }, [discoverySector]);

  const screenerQuery = useQuery({
    queryKey: ["screener", exchange, sector],
    queryFn: () => screenerApi.getSector(sector, exchange),
    enabled: mode === "large-cap",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const discoveryQuery = useQuery({
    queryKey: ["discovery", exchange, discoverySector],
    queryFn: () => discoveryApi.get(discoverySector, exchange),
    enabled: mode === "discovery",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const activeQuery = mode === "large-cap" ? screenerQuery : discoveryQuery;
  const sectorLabel = SECTORS.find((s) => s.id === sector)?.label ?? sector;
  const discoverySectorLabel = SECTORS.find((s) => s.id === discoverySector)?.label ?? discoverySector;

  const weightsLegend = screenerQuery.data
    ? screenerQuery.data.score_labels
        .map((l, i) => `${l} ${screenerQuery.data!.score_weights[i]}`)
        .join(" · ")
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Screener</h2>
        </div>
        <p className="text-gray-500 text-sm">
          {mode === "large-cap"
            ? "Top large-cap picks by sector, ranked by factor-based composite scores that adapt to each sector's characteristics."
            : "Small/mid-cap stocks ($300M–$5B) close to their Graham Number with fundamentals above a quality floor — names too small to ever appear in the large-cap screener."}
        </p>
      </div>

      {/* Market toggle */}
      <div className="flex gap-1.5">
        {EXCHANGES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setExchange(ex.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              exchange === ex.id
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            <span>{ex.flag}</span>
            {ex.label}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode("large-cap")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "large-cap"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
          }`}
        >
          <TrendingUp size={13} />
          Large Cap
        </button>
        <button
          onClick={() => setMode("discovery")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === "discovery"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
          }`}
        >
          <Compass size={13} />
          Discovery
        </button>
      </div>

      {/* Sector tabs — sector is required in both modes */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTORS.map((s) => (
          <button
            key={s.id}
            onClick={() => (mode === "large-cap" ? setSector(s.id) : setDiscoverySector(s.id))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              (mode === "large-cap" ? sector : discoverySector) === s.id
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {activeQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={28} className="text-emerald-400 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium">
              {mode === "large-cap"
                ? `Analyzing ${sectorLabel}…`
                : `Screening ${discoverySectorLabel}…`}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "large-cap"
                ? "Scoring the top large-cap names by market cap in this sector. This takes 15–30 seconds."
                : "Evaluating small/mid-cap candidates against Graham Number and quality floors. This takes 15–30 seconds."}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {activeQuery.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {(activeQuery.error as Error).message}
        </div>
      )}

      {/* Large-cap results */}
      {mode === "large-cap" && screenerQuery.data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{screenerQuery.data.stocks_analyzed}</span> stocks
              analyzed in{" "}
              <span className="text-white font-semibold">{sectorLabel}</span>
              {" "}·{" "}
              <span className="text-gray-500">{screenerQuery.data.scoring_model} model</span>
            </p>
            {weightsLegend && (
              <p className="text-xs text-gray-600">Weights: {weightsLegend}</p>
            )}
          </div>

          <div className="space-y-3">
            {screenerQuery.data.results.map((entry, i) => (
              <ScreenerCard key={entry.ticker} entry={entry} rank={i + 1} data={screenerQuery.data!} />
            ))}
          </div>

          <p className="text-xs text-gray-600 border-t border-gray-800 pt-4">
            {screenerQuery.data.disclaimer}
          </p>
        </div>
      )}

      {/* Discovery results */}
      {mode === "discovery" && discoveryQuery.data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{discoveryQuery.data.candidates_screened}</span> candidates
              screened in{" "}
              <span className="text-white font-semibold">{discoverySectorLabel}</span>
              {" "}·{" "}
              <span className="text-white font-semibold">{discoveryQuery.data.results.length}</span> matched
            </p>
            <p className="text-xs text-gray-600">
              {formatMarketCap(discoveryQuery.data.market_cap_floor, discoveryQuery.data.currency)}–
              {formatMarketCap(discoveryQuery.data.market_cap_ceiling, discoveryQuery.data.currency)} market cap · ±
              {discoveryQuery.data.deviation_band_pct}% of Graham Number
            </p>
          </div>

          {discoveryQuery.data.results.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              No candidates in this sector currently sit near their Graham Number with fundamentals
              above the quality floor. Try another sector or check back later — the universe is
              re-screened on every request.
            </div>
          ) : (
            <div className="space-y-3">
              {discoveryQuery.data.results.map((entry, i) => (
                <DiscoveryCard key={entry.ticker} entry={entry} rank={i + 1} currency={discoveryQuery.data!.currency} />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 border-t border-gray-800 pt-4">
            {discoveryQuery.data.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
