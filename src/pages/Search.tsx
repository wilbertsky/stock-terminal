import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, ExternalLink, Building2, Users, Globe } from "lucide-react";
import { stock, SummaryResponse, PiotroskiResponse, CompanyProfile, CompanyNewsResponse } from "../api/client";
import { TickerTooltip } from "../components/TickerTooltip";
import { CompanyLogo } from "../components/CompanyLogo";
import { SectionHelp } from "../components/SectionHelp";
import { StockAutocomplete } from "../components/StockAutocomplete";
import { StatCard } from "../components/StatCard";
import { ScoreGauge } from "../components/ScoreGauge";
import { PiotroskiGrid } from "../components/PiotroskiGrid";
import { AddToPortfolioModal } from "../components/AddToPortfolioModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const fmt = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toFixed(decimals);

const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;


function RevenueChart({ years }: { years: SummaryResponse["fundamentals"]["years"] }) {
  const data = years
    .filter((y) => y.revenue != null)
    .map((y) => ({
      year: y.fiscal_year.slice(0, 4),
      revenue: (y.revenue! / 1e9).toFixed(2),
    }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="year"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 8,
            color: "#fff",
          }}
          formatter={(v: unknown) => [`$${v}B`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EpsChart({ years }: { years: SummaryResponse["fundamentals"]["years"] }) {
  const data = years
    .filter((y) => y.eps != null)
    .map((y) => ({ year: y.fiscal_year.slice(0, 4), eps: y.eps!.toFixed(2) }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="year"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 8,
            color: "#fff",
          }}
          formatter={(v: unknown) => [`$${v}`, "EPS"]}
        />
        <Bar dataKey="eps" fill="#818cf8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CompanyDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 300;
  const short = text.length > LIMIT;
  return (
    <div>
      <p className="text-sm text-gray-400 leading-relaxed">
        {expanded || !short ? text : `${text.slice(0, LIMIT)}…`}
      </p>
      {short && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 transition-colors"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function Search() {
  const [searchParams] = useSearchParams();
  const [ticker, setTicker] = useState<string | null>(
    () => searchParams.get("ticker")?.toUpperCase() ?? null
  );
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  // Sync when navigated here from the screener via ?ticker=
  useEffect(() => {
    const t = searchParams.get("ticker")?.toUpperCase() ?? null;
    if (t) setTicker(t);
  }, [searchParams]);

  const summaryQ = useQuery<SummaryResponse, Error>({
    queryKey: ["summary", ticker],
    queryFn: () => stock.summary(ticker!),
    enabled: !!ticker,
    retry: false,
  });

  const piotroskiQ = useQuery<PiotroskiResponse, Error>({
    queryKey: ["piotroski", ticker],
    queryFn: () => stock.piotroski(ticker!),
    enabled: !!ticker,
    retry: false,
  });

  const profileQ = useQuery<CompanyProfile, Error>({
    queryKey: ["profile", ticker],
    queryFn: () => stock.profile(ticker!),
    enabled: !!ticker,
    retry: false,
  });

  const newsQ = useQuery<CompanyNewsResponse, Error>({
    queryKey: ["news", ticker],
    queryFn: () => stock.news(ticker!),
    enabled: !!ticker,
    retry: false,
  });

  function handleSelect(symbol: string) {
    setTicker(symbol.toUpperCase());
  }

  const s = summaryQ.data;
  const p = piotroskiQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Stock Search</h2>
        <p className="text-gray-500 text-sm">
          Enter a ticker to run all quantitative analyses.
        </p>
      </div>

      {/* Search bar */}
      <StockAutocomplete
        onSelect={handleSelect}
        loading={summaryQ.isLoading}
      />

      {/* Loading */}
      {summaryQ.isLoading && (
        <p className="text-gray-400 text-sm">Fetching data…</p>
      )}

      {/* Error */}
      {summaryQ.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {summaryQ.error.message}
        </div>
      )}

      {/* Results */}
      {s && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <CompanyLogo ticker={s.ticker} />
            <div className="flex-1">
              <div className="flex items-baseline gap-3">
                <TickerTooltip ticker={s.ticker}>
                  <h3 className="text-2xl font-bold text-white">{s.ticker}</h3>
                </TickerTooltip>
                {s.current_price != null && (
                  <span className="text-2xl font-bold text-emerald-400">
                    ${s.current_price.toFixed(2)}
                  </span>
                )}
              </div>
              {s.current_price != null && (s.intrinsic_value || s.graham_number) && (
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  {s.intrinsic_value && (
                    <span>
                      vs intrinsic{" "}
                      <span className={
                        s.current_price <= s.intrinsic_value.margin_of_safety_price
                          ? "text-emerald-400"
                          : s.current_price <= s.intrinsic_value.estimated_intrinsic_value
                          ? "text-amber-400"
                          : "text-red-400"
                      }>
                        {s.current_price <= s.intrinsic_value.margin_of_safety_price
                          ? "▼ below margin of safety"
                          : s.current_price <= s.intrinsic_value.estimated_intrinsic_value
                          ? "▼ below intrinsic value"
                          : "▲ above intrinsic value"}
                      </span>
                    </span>
                  )}
                  {s.intrinsic_value && s.graham_number && <span>·</span>}
                  {s.graham_number && (
                    <span>
                      Graham{" "}
                      <span className={
                        s.current_price <= s.graham_number.graham_number
                          ? "text-emerald-400"
                          : "text-red-400"
                      }>
                        {s.current_price <= s.graham_number.graham_number ? "▼ undervalued" : "▲ overvalued"}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Add to portfolio */}
            <button
              onClick={() => setShowPortfolioModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors flex-shrink-0"
            >
              <Plus size={13} />
              Add to Portfolio
            </button>
          </div>

          {/* Portfolio modal */}
          {showPortfolioModal && (
            <AddToPortfolioModal
              ticker={s.ticker}
              onClose={() => setShowPortfolioModal(false)}
            />
          )}

          {/* Scores */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-300">Score Overview</h4>
              <SectionHelp title="Score Overview">
                <p>Three composite scores that give a quick health check on the stock from different angles.</p>
                <p><span className="text-white font-medium">Momentum Score (0–100)</span> measures how the stock has been performing in price relative to the S&P 500 (SPY) over the past 3, 6, and 12 months. A score above 50 means the stock is outperforming the market; below 50 means underperforming.</p>
                <p><span className="text-white font-medium">Piotroski F-Score (0–9)</span> scores the fundamental financial health of the business across 9 signals covering profitability, leverage, and efficiency. 7–9 is strong, 4–6 is moderate, 0–3 is weak.</p>
                <p><span className="text-white font-medium">PEG Ratio</span> is a rough gauge of valuation relative to growth. Below 1 is generally considered undervalued; above 2 may indicate an expensive stock relative to its growth rate.</p>
              </SectionHelp>
            </div>
            <div className="flex gap-6 flex-wrap">
              <ScoreGauge
                score={s.momentum.momentum_score}
                label="Momentum"
              />
              {p && (
                <ScoreGauge score={p.score} max={9} label="Piotroski" />
              )}
              {s.peg && (
                <ScoreGauge
                  score={s.peg.peg_ratio < 1 ? 80 : s.peg.peg_ratio < 2 ? 50 : 20}
                  label="PEG"
                />
              )}
            </div>
          </div>

          {/* Valuation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Valuation</h4>
              <SectionHelp title="Valuation Estimates">
                <p>These are estimates of what a stock may be <span className="text-white">worth</span> based on fundamentals — not what it is currently trading at.</p>
                <p><span className="text-white font-medium">Intrinsic Value (DCF)</span> — Discounted Cash Flow. Projects earnings per share (EPS) 10 years forward at the historical growth rate, applies a growth-adjusted P/E ratio, then discounts the result back to today at a 15% required return. This is a simplified version of a standard DCF model.</p>
                <p><span className="text-white font-medium">Margin of Safety</span> — 50% of the intrinsic value estimate. Benjamin Graham, the father of value investing, recommended buying at a significant discount to intrinsic value to protect against errors in the estimate. This is that buffer price.</p>
                <p><span className="text-white font-medium">Graham Number</span> — A conservative valuation formula: √(22.5 × EPS × Book Value Per Share). It assumes a fair P/E of 15 and a fair Price-to-Book of 1.5. Works best for stable, asset-heavy companies; tends to undervalue high-growth businesses.</p>
                <p><span className="text-white font-medium">PEG Ratio</span> — Price-to-Earnings divided by the annual EPS growth rate. A PEG below 1 suggests the stock may be undervalued relative to its growth; above 2 may be overvalued.</p>
              </SectionHelp>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Intrinsic Value"
                value={s.intrinsic_value ? `$${fmt(s.intrinsic_value.estimated_intrinsic_value)}` : "N/A"}
                sub={s.intrinsic_value ? "DCF estimate" : "Negative or zero EPS growth"}
              />
              <StatCard
                label="Margin of Safety"
                value={s.intrinsic_value ? `$${fmt(s.intrinsic_value.margin_of_safety_price)}` : "N/A"}
                sub={s.intrinsic_value ? "50% of intrinsic" : "Negative or zero EPS growth"}
              />
              <StatCard
                label="Graham Number"
                value={s.graham_number ? `$${fmt(s.graham_number.graham_number)}` : "N/A"}
                sub={s.graham_number ? "sqrt(22.5 × EPS × BVPS)" : "Requires positive EPS & book value"}
              />
              <StatCard
                label="PEG Ratio"
                value={s.peg ? fmt(s.peg.peg_ratio) : "N/A"}
                sub={s.peg ? `P/E ${fmt(s.peg.pe_ratio)} / growth ${fmt(s.peg.earnings_growth_rate_pct)}%` : "Negative or zero growth"}
                positive={s.peg ? (s.peg.peg_ratio < 1 ? true : s.peg.peg_ratio > 2 ? false : null) : null}
              />
            </div>
          </div>

          {/* Growth rates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Growth Rates (CAGR)</h4>
              <SectionHelp title="Growth Rates — CAGR">
                <p><span className="text-white font-medium">CAGR</span> stands for Compound Annual Growth Rate — the steady annual rate at which a metric would have grown to reach its end value from its starting value over the period shown.</p>
                <p><span className="text-white font-medium">EPS (Earnings Per Share)</span> — Net profit divided by the number of shares. Growing EPS means the company is becoming more profitable per share over time.</p>
                <p><span className="text-white font-medium">Revenue</span> — Total income from sales. Consistent revenue growth shows the business is expanding.</p>
                <p><span className="text-white font-medium">ROIC (Return on Invested Capital)</span> — How efficiently the company turns invested capital into profit. Above 10% is generally good; above 15% is excellent.</p>
                <p><span className="text-white font-medium">FCF/Share (Free Cash Flow per Share)</span> — Cash left over after operating expenses and capital expenditures, per share. Free cash flow is considered a cleaner measure of profitability than net income.</p>
                <p><span className="text-white font-medium">BVPS (Book Value Per Share)</span> — Net assets of the company divided by shares outstanding. Growing book value indicates the company is building wealth for shareholders.</p>
              </SectionHelp>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="EPS 1yr"
                value={pct(s.growth_rates.eps.cagr_1yr)}
                positive={
                  s.growth_rates.eps.cagr_1yr != null
                    ? s.growth_rates.eps.cagr_1yr > 0
                    : null
                }
              />
              <StatCard
                label="EPS 5yr"
                value={pct(s.growth_rates.eps.cagr_5yr)}
                positive={
                  s.growth_rates.eps.cagr_5yr != null
                    ? s.growth_rates.eps.cagr_5yr > 0
                    : null
                }
              />
              <StatCard
                label="Revenue 5yr"
                value={pct(s.growth_rates.revenue.cagr_5yr)}
                positive={
                  s.growth_rates.revenue.cagr_5yr != null
                    ? s.growth_rates.revenue.cagr_5yr > 0
                    : null
                }
              />
              <StatCard
                label="ROIC 5yr"
                value={pct(s.growth_rates.roic.cagr_5yr)}
                positive={
                  s.growth_rates.roic.cagr_5yr != null
                    ? s.growth_rates.roic.cagr_5yr > 0
                    : null
                }
              />
              <StatCard
                label="FCF/Share 5yr"
                value={pct(s.growth_rates.free_cash_flow_per_share.cagr_5yr)}
                positive={
                  s.growth_rates.free_cash_flow_per_share.cagr_5yr != null
                    ? s.growth_rates.free_cash_flow_per_share.cagr_5yr > 0
                    : null
                }
              />
              <StatCard
                label="BVPS 5yr"
                value={pct(s.growth_rates.book_value_per_share.cagr_5yr)}
                positive={
                  s.growth_rates.book_value_per_share.cagr_5yr != null
                    ? s.growth_rates.book_value_per_share.cagr_5yr > 0
                    : null
                }
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">Revenue ($B)</h4>
                <SectionHelp title="Revenue">
                  <p><span className="text-white font-medium">Revenue</span> (also called sales or turnover) is the total amount of money a company receives from its business activities before any expenses are deducted.</p>
                  <p>Think of it as the "top line" of the income statement. It tells you how large the business is and whether it is growing over time.</p>
                  <p>Consistent revenue growth year over year is a positive sign. Declining revenue may indicate the business is losing customers or market share.</p>
                  <p>Values shown are in <span className="text-white">billions of USD</span>.</p>
                </SectionHelp>
              </div>
              <RevenueChart years={s.fundamentals.years} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">EPS ($)</h4>
                <SectionHelp title="EPS — Earnings Per Share">
                  <p><span className="text-white font-medium">EPS (Earnings Per Share)</span> is the company's net profit divided by the total number of outstanding shares.</p>
                  <p>It represents how much profit the company generated for each share of stock. If EPS is $6.00 and you own 10 shares, the company earned $60 on your behalf.</p>
                  <p>Growing EPS over time is one of the most important signals of a healthy, compounding business. Declining EPS can indicate shrinking profits or share dilution.</p>
                  <p>This chart shows <span className="text-white">annual diluted EPS</span> — calculated using the total share count including stock options and convertible securities.</p>
                </SectionHelp>
              </div>
              <EpsChart years={s.fundamentals.years} />
            </div>
          </div>

          {/* Momentum */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Momentum vs SPY</h4>
              <SectionHelp title="Momentum vs SPY">
                <p><span className="text-white font-medium">Momentum</span> measures how a stock's price has moved over a period of time. Stocks that have been rising tend to continue rising; stocks that have been falling tend to continue falling — this is known as the momentum effect, one of the most well-documented phenomena in finance.</p>
                <p><span className="text-white font-medium">SPY</span> is the S&P 500 ETF, used here as the benchmark for the overall US stock market.</p>
                <p><span className="text-white font-medium">Return %</span> is the price change over the period (3 months ≈ 63 trading days, 6 months ≈ 126, 12 months ≈ 252).</p>
                <p><span className="text-white font-medium">Relative Strength</span> is the stock's return minus SPY's return for the same period. Positive means the stock outperformed the market; negative means it underperformed.</p>
                <p>The <span className="text-white font-medium">Momentum Score (0–100)</span> is a composite: 50 is neutral (matching SPY), above 50 means outperforming across periods, below 50 means underperforming.</p>
              </SectionHelp>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["3m", "6m", "12m"] as const).map((period) => {
                const ret = s.momentum[`return_${period}` as keyof typeof s.momentum] as number | null;
                const spy = s.momentum[`spy_return_${period}` as keyof typeof s.momentum] as number | null;
                const rel = s.momentum[`relative_strength_${period}` as keyof typeof s.momentum] as number | null;
                return (
                  <div
                    key={period}
                    className="bg-gray-800 rounded-lg p-3 space-y-1"
                  >
                    <p className="text-xs text-gray-500 uppercase">{period}</p>
                    <p
                      className={`text-base font-bold ${ret != null && ret >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {ret != null ? `${(ret * 100).toFixed(1)}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      SPY {spy != null ? `${(spy * 100).toFixed(1)}%` : "—"}
                    </p>
                    <p
                      className={`text-xs font-medium ${rel != null && rel >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {rel != null
                        ? `${rel >= 0 ? "+" : ""}${(rel * 100).toFixed(1)}% vs SPY`
                        : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-3 italic">
              {s.momentum.interpretation}
            </p>
          </div>

          {/* Piotroski */}
          {p && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-300">Piotroski F-Score</h4>
                  <SectionHelp title="Piotroski F-Score">
                    <p>The <span className="text-white font-medium">Piotroski F-Score</span> was developed by Stanford accounting professor Joseph Piotroski in 2000. It scores a company's financial health from 0 to 9 using 9 binary signals (pass = 1, fail = 0).</p>
                    <p><span className="text-white font-medium">Profitability (F1–F4)</span></p>
                    <p>F1: ROA positive — the company is making a profit on its assets.<br/>F2: Operating cash flow positive — real cash is being generated.<br/>F3: ROA improving — profitability is increasing year over year.<br/>F4: Low accruals — cash earnings are close to reported earnings (quality signal).</p>
                    <p><span className="text-white font-medium">Leverage & Liquidity (F5–F7)</span></p>
                    <p>F5: Long-term debt decreasing — the balance sheet is getting stronger.<br/>F6: Current ratio improving — short-term financial health is improving.<br/>F7: No share dilution — the company isn't issuing new shares to raise cash.</p>
                    <p><span className="text-white font-medium">Efficiency (F8–F9)</span></p>
                    <p>F8: Gross margin improving — pricing power or cost efficiency is increasing.<br/>F9: Asset turnover improving — the company is generating more revenue per dollar of assets.</p>
                    <p><span className="text-emerald-400">7–9 = Strong</span> · <span className="text-amber-400">4–6 = Moderate</span> · <span className="text-red-400">0–3 = Weak</span></p>
                  </SectionHelp>
                </div>
                <span
                  className={`text-lg font-bold ${p.score >= 7 ? "text-emerald-400" : p.score >= 4 ? "text-amber-400" : "text-red-400"}`}
                >
                  {p.score}/9
                </span>
              </div>
              <PiotroskiGrid data={p} />
              <p className="text-xs text-gray-600 mt-3 italic">
                {p.interpretation}
              </p>
            </div>
          )}

          {/* Company Overview */}
          {profileQ.data && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Company Overview</h4>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-3 text-xs">
                {profileQ.data.sector && (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Building2 size={12} className="text-gray-500" />
                    {profileQ.data.sector}
                    {profileQ.data.industry && (
                      <span className="text-gray-600">· {profileQ.data.industry}</span>
                    )}
                  </span>
                )}
                {profileQ.data.employees != null && (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Users size={12} className="text-gray-500" />
                    {profileQ.data.employees.toLocaleString()} employees
                  </span>
                )}
                {profileQ.data.website && (
                  <a
                    href={profileQ.data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Globe size={12} />
                    {profileQ.data.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              {/* Description with expand/collapse */}
              {profileQ.data.description && (
                <CompanyDescription text={profileQ.data.description} />
              )}
            </div>
          )}

          {/* Latest News */}
          {newsQ.data && newsQ.data.items.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-1">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Latest News</h4>
              <div className="divide-y divide-gray-800">
                {newsQ.data.items.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 py-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 group-hover:text-white leading-snug transition-colors line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {item.source && <span className="text-gray-400">{item.source}</span>}
                        {item.source && item.published && <span>·</span>}
                        {item.published && (
                          <span>{new Date(item.published).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        )}
                      </div>
                      {item.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                    <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
