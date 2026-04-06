import { useQuery } from "@tanstack/react-query";
import { auth, portfolioApi, PortfolioRow } from "../api/client";
import { StatCard } from "../components/StatCard";
import { BriefcaseBusiness, Search, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const navigate = useNavigate();
  const meQ = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const portfoliosQ = useQuery<PortfolioRow[], Error>({
    queryKey: ["portfolios"],
    queryFn: () => portfolioApi.list(),
  });

  const portfolioCount = portfoliosQ.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Welcome back{meQ.data ? `, ${meQ.data.email.split("@")[0]}` : ""}
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">
          Quantitative stock analysis &amp; portfolio tracking
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Portfolios"
          value={portfolioCount}
          sub="Active portfolios"
        />
        <StatCard
          label="Data Sources"
          value="2 Active"
          positive={true}
          sub="SEC EDGAR · Yahoo Finance"
        />
        <StatCard
          label="API Status"
          value="Connected"
          positive={true}
          sub=""
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/search")}
            className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl p-4 text-left group transition-colors"
          >
            <Search
              size={20}
              className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform"
            />
            <p className="text-white font-medium text-sm">Analyse a Stock</p>
            <p className="text-gray-500 text-xs mt-0.5">
              DCF, Graham, Piotroski, Momentum
            </p>
          </button>

          <button
            onClick={() => navigate("/portfolio")}
            className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl p-4 text-left group transition-colors"
          >
            <BriefcaseBusiness
              size={20}
              className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform"
            />
            <p className="text-white font-medium text-sm">View Portfolio</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Live performance &amp; allocation
            </p>
          </button>

          <button
            onClick={() => navigate("/screener")}
            className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl p-4 text-left group transition-colors"
          >
            <TrendingUp
              size={20}
              className="text-pink-400 mb-2 group-hover:scale-110 transition-transform"
            />
            <p className="text-white font-medium text-sm">Sector Screener</p>
            <p className="text-gray-500 text-xs mt-0.5">
              S&amp;P 500 + Nasdaq 100, ranked by composite score
            </p>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-600 border border-gray-800 rounded-lg p-3">
        <strong className="text-gray-500">Disclaimer:</strong> All scores and
        analysis are for educational purposes only. They do not constitute
        investment advice or a recommendation to buy or sell any security.
        Always conduct your own research and consult a licensed financial
        advisor.
      </p>
    </div>
  );
}
