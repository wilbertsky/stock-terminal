import { useQuery } from "@tanstack/react-query";
import { communityApi, PublicPortfolioSummary } from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import { TrendingUp, TrendingDown, Users } from "lucide-react";

function PortfolioCard({ p }: { p: PublicPortfolioSummary }) {
  const ret = p.total_return_pct;
  const positive = ret != null && ret >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{p.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">@{p.owner}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 text-sm font-bold ${
            ret == null ? "text-gray-500" : positive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {ret != null &&
            (positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />)}
          {ret != null
            ? `${positive ? "+" : ""}${ret.toFixed(2)}%`
            : "—"}
        </div>
      </div>

      {/* Holdings */}
      <div className="space-y-1">
        {p.holdings.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between py-1.5 border-b border-gray-800/60 last:border-0"
          >
            <div className="flex items-center gap-2">
              <CompanyLogo ticker={h.ticker} size="sm" />
              <span className="text-sm font-medium text-white">{h.ticker}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">${h.current_price.toFixed(2)}</span>
              <span
                className={`font-semibold w-16 text-right ${
                  h.return_pct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {h.return_pct >= 0 ? "+" : ""}
                {h.return_pct.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
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
          Public portfolios from all subscribers, ranked by unrealized gains.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.data.map((p) => (
            <PortfolioCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
