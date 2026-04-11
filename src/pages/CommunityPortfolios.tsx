import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { communityApi, PublicPortfolioSummary } from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function gainColor(v: number) {
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

function fmt$(v: number) {
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function RankBadge({ rank }: { rank: number }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold";
  if (rank === 1) return <div className={`${base} bg-amber-400/20 text-amber-300`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gray-400/20 text-gray-300`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-orange-700/20 text-orange-400`}>3</div>;
  return <div className={`${base} bg-gray-800 text-gray-500`}>{rank}</div>;
}

function PortfolioCard({ p, rank }: { p: PublicPortfolioSummary; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasOpen = p.holdings.length > 0;
  const hasRealized = p.realized.rows.length > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Collapsed header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <RankBadge rank={rank} />

        {/* Name + owner */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
          <p className="text-xs text-gray-500">@{p.owner}</p>
        </div>

        {/* Gains summary */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          {/* Unrealized % */}
          {p.total_return_pct != null && (
            <div className="text-right hidden sm:block">
              <p className="text-gray-600 leading-none mb-0.5">Unrealized</p>
              <p className={`font-semibold ${gainColor(p.total_return_pct)}`}>
                {fmtPct(p.total_return_pct)}
              </p>
            </div>
          )}

          {/* Realized $ */}
          {hasRealized && (
            <div className="text-right hidden sm:block">
              <p className="text-gray-600 leading-none mb-0.5">Realized</p>
              <p className={`font-semibold ${gainColor(p.realized.total_realized_gain)}`}>
                {fmt$(p.realized.total_realized_gain)}
              </p>
            </div>
          )}

          {/* Combined $ — always shown, primary ranking signal */}
          <div className="text-right">
            <p className="text-gray-600 leading-none mb-0.5">Combined</p>
            <div className={`flex items-center gap-1 font-bold text-sm ${gainColor(p.combined_gain)}`}>
              {p.combined_gain >= 0
                ? <TrendingUp size={13} />
                : <TrendingDown size={13} />}
              {fmt$(p.combined_gain)}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <div className="text-gray-600 ml-1">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* On small screens show the hidden stats in a row */}
          <div className="sm:hidden flex gap-4 px-4 py-2 text-xs border-b border-gray-800">
            {p.total_return_pct != null && (
              <div>
                <p className="text-gray-600">Unrealized</p>
                <p className={`font-semibold ${gainColor(p.total_return_pct)}`}>
                  {fmtPct(p.total_return_pct)}
                </p>
              </div>
            )}
            {hasRealized && (
              <div>
                <p className="text-gray-600">Realized</p>
                <p className={`font-semibold ${gainColor(p.realized.total_realized_gain)}`}>
                  {fmt$(p.realized.total_realized_gain)}
                </p>
              </div>
            )}
          </div>

          {/* Open positions */}
          {hasOpen && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open Positions
              </p>
              {p.holdings.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CompanyLogo ticker={h.ticker} size="sm" />
                    <span className="text-sm font-medium text-white">{h.ticker}</span>
                    {h.shares != null && (
                      <span className="text-xs text-gray-600">{h.shares} shares</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">${h.current_price.toFixed(2)}</span>
                    <span className={`font-semibold w-16 text-right ${gainColor(h.return_pct)}`}>
                      {fmtPct(h.return_pct)}
                    </span>
                    {h.shares != null && (
                      <span className={`font-semibold w-20 text-right ${gainColor(h.return_pct)}`}>
                        {fmt$((h.current_price - h.price_at_add) * h.shares)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Closed positions */}
          {hasRealized && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Closed Positions
              </p>
              {p.realized.rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CompanyLogo ticker={r.ticker} size="sm" />
                    <span className="text-sm font-medium text-white">{r.ticker}</span>
                    <span className="text-xs text-gray-600">
                      {r.shares.toFixed(r.shares % 1 === 0 ? 0 : 4)} shares
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">
                      ${r.cost_per_share.toFixed(2)} → ${r.sale_price.toFixed(2)}
                    </span>
                    <span className={`font-semibold w-20 text-right ${gainColor(r.realized_gain)}`}>
                      {fmt$(r.realized_gain)}
                    </span>
                    <span className="text-gray-600 w-20 text-right">
                      {new Date(r.sold_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CommunityPortfolios() {
  const q = useQuery<PublicPortfolioSummary[], Error>({
    queryKey: ["community"],
    queryFn: communityApi.list,
    refetchInterval: 120_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Community</h2>
        <p className="text-gray-500 text-sm">
          Public portfolios ranked by combined P&L — realized gains plus unrealized dollar gains.
        </p>
      </div>

      {q.isLoading && (
        <p className="text-gray-400 text-sm">Loading portfolios…</p>
      )}
      {q.isError && (
        <p className="text-red-400 text-sm">{q.error.message}</p>
      )}
      {q.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-600 border border-gray-800 rounded-xl border-dashed">
          <Users size={32} />
          <p className="text-sm">No public portfolios yet.</p>
        </div>
      )}
      {q.data && q.data.length > 0 && (
        <div className="space-y-2">
          {q.data.map((p, i) => (
            <PortfolioCard key={p.id} p={p} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
