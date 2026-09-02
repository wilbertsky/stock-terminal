import { useQuery } from "@tanstack/react-query";
import { aiPortfolioApi, AiHoldingDetail } from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Cpu,
  CalendarClock,
  CircleDollarSign,
  Info,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function gainColor(v: number) {
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmt$(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const styles: Record<string, string> = {
    positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    neutral:  "bg-gray-500/15 text-gray-400 border-gray-500/30",
    negative: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider border px-1.5 py-0.5 rounded-full ${styles[sentiment] ?? styles.neutral}`}>
      {sentiment}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-600 text-xs">—</span>;
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400">{score.toFixed(0)}</span>
    </div>
  );
}

// ── Holding row ───────────────────────────────────────────────────────────────

function HoldingRow({ h }: { h: AiHoldingDetail }) {
  const invested = h.price_at_add * (h.shares ?? 1);
  const value    = h.current_price * (h.shares ?? 1);

  return (
    <tr className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <CompanyLogo ticker={h.ticker} size="sm" />
          <div>
            <div className="text-sm font-semibold text-white">{h.ticker}</div>
            {h.sector && <div className="text-[10px] text-gray-500 capitalize">{h.sector.replace(/-/g, " ")}</div>}
          </div>
        </div>
      </td>

      <td className="py-3 px-3 text-right">
        <div className="text-sm text-white">{fmt$(h.current_price)}</div>
        <div className="text-[10px] text-gray-500">cost {fmt$(h.price_at_add)}</div>
      </td>

      <td className={`py-3 px-3 text-right text-sm font-semibold ${gainColor(h.return_pct)}`}>
        <div className="flex items-center justify-end gap-1">
          {h.return_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {fmtPct(h.return_pct)}
        </div>
        <div className={`text-[10px] font-normal ${gainColor(value - invested)}`}>
          {fmt$(value - invested)}
        </div>
      </td>

      <td className="py-3 px-3">
        <ScoreBar score={h.composite_score_at_selection} />
      </td>

      <td className="py-3 px-3">
        <SentimentBadge sentiment={h.news_sentiment_at_selection} />
      </td>

      <td className="py-3 pl-3 pr-4">
        {h.cycle && <div className="text-[10px] text-gray-500 mb-0.5">{h.cycle}</div>}
        {h.selection_rationale && (
          <div className="text-[10px] text-gray-400 max-w-xs truncate" title={h.selection_rationale}>
            {h.selection_rationale}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AiPortfolio() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ai-portfolio"],
    queryFn: aiPortfolioApi.get,
    refetchInterval: 300_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm gap-2">
        <Cpu size={16} className="animate-pulse" />
        Loading AI portfolio…
      </div>
    );
  }

  if (isError) {
    const msg = (error as Error).message;
    const notCreated = msg.includes("404") || msg.toLowerCase().includes("not found");
    return (
      <div className="max-w-xl mx-auto mt-16 text-center space-y-3">
        <Bot size={40} className="mx-auto text-gray-600" />
        <p className="text-gray-400 text-sm">
          {notCreated
            ? "The AI portfolio hasn't been created yet. Trigger the first rebalance to initialise it."
            : `Failed to load AI portfolio: ${msg}`}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const hasHoldings = data.holdings.length > 0;
  const returnPct   = data.total_return_pct;

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={20} className="text-emerald-400" />
            <h1 className="text-white font-bold text-xl">{data.name}</h1>
          </div>
          <p className="text-gray-500 text-sm max-w-lg">
            Automatically selected and rebalanced quarterly using sector screener scores and news
            sentiment analysis. ${data.quarterly_allocation.toLocaleString()} deployed per cycle.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center min-w-[120px]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <CircleDollarSign size={10} /> Portfolio Value
            </div>
            <div className="text-white font-bold text-lg">{fmt$(data.total_value)}</div>
            <div className="text-[10px] text-gray-600">invested {fmt$(data.total_invested)}</div>
          </div>

          <div className={`bg-gray-900 border rounded-xl px-4 py-3 text-center min-w-[120px] ${returnPct != null && returnPct >= 0 ? "border-emerald-800/50" : "border-red-900/50"}`}>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Return</div>
            {returnPct != null ? (
              <div className={`font-bold text-lg ${gainColor(returnPct)}`}>{fmtPct(returnPct)}</div>
            ) : (
              <div className="text-gray-600 text-lg">—</div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center min-w-[120px]">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <CalendarClock size={10} /> Next Review
            </div>
            <div className="text-white font-semibold text-sm">{data.next_review}</div>
            <div className="text-[10px] text-gray-600">{data.current_cycle}</div>
          </div>
        </div>
      </div>

      {/* Holdings table */}
      {hasHoldings ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Holdings — {data.holdings.length} position{data.holdings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <th className="py-2 pl-4 pr-2 font-medium">Ticker</th>
                  <th className="py-2 px-3 font-medium text-right">Price</th>
                  <th className="py-2 px-3 font-medium text-right">Return</th>
                  <th className="py-2 px-3 font-medium">Score at Selection</th>
                  <th className="py-2 px-3 font-medium">News Sentiment</th>
                  <th className="py-2 pl-3 pr-4 font-medium">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <HoldingRow key={h.id} h={h} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-gray-500 text-sm">
          No holdings yet. The portfolio will be populated on the first rebalance cycle.
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex gap-2 text-[11px] text-gray-600 leading-relaxed bg-gray-900/50 border border-gray-800/60 rounded-lg px-4 py-3">
        <Info size={13} className="shrink-0 mt-0.5 text-gray-500" />
        <span>{data.disclaimer}</span>
      </div>
    </div>
  );
}
