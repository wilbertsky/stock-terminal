import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, ExternalLink, Building2, Users, Globe } from "lucide-react";
import {
  stock,
  SummaryResponse,
  PiotroskiResponse,
  QualityScoreResponse,
  DividendMetricsResponse,
  CompanyProfile,
  CompanyNewsResponse,
} from "../api/client";
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

/** Map FMP profile sector string to our screener model name. */
function sectorModelName(sector: string | undefined | null): string {
  if (!sector) return "Standard";
  const s = sector.toLowerCase();
  if (s.includes("financial")) return "Financials";
  if (s.includes("real estate")) return "Real Estate";
  if (s.includes("energy")) return "Energy";
  if (s.includes("utilities") || s.includes("consumer staples")) return "Dividend";
  return "Standard";
}

/** Piotroski is meaningful for operating businesses — not banks or REITs. */
function usesPiotroski(sector: string | undefined | null): boolean {
  const m = sectorModelName(sector);
  return m === "Standard" || m === "Energy";
}

/** DCF intrinsic value and Graham Number don't apply to banks or REITs. */
function usesDcfValuation(sector: string | undefined | null): boolean {
  const m = sectorModelName(sector);
  return m !== "Financials" && m !== "Real Estate";
}

function pbScore(pb: number | null): number | null {
  if (pb == null) return null;
  return pb <= 1.0 ? 100 : pb <= 1.5 ? 80 : pb <= 2.0 ? 60 : pb <= 3.0 ? 40 : pb <= 5.0 ? 20 : 5;
}

function debtSafetyScore(de: number | null): number | null {
  if (de == null) return null;
  return de < 0.3 ? 100 : de < 0.6 ? 80 : de < 1.0 ? 60 : de < 1.5 ? 40 : de < 2.5 ? 20 : 5;
}


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

function ValuationSection({
  sector,
  s,
  quality,
  dividend,
}: {
  sector: string | undefined | null;
  s: SummaryResponse;
  quality: QualityScoreResponse | undefined;
  dividend: DividendMetricsResponse | undefined;
}) {
  const model = sectorModelName(sector);

  // Derived metrics computed from existing summary data
  const recentYear = s.fundamentals.years[s.fundamentals.years.length - 1];
  const bvps = recentYear?.book_value_per_share ?? s.graham_number?.book_value_per_share ?? null;
  const pb = bvps && bvps > 0 && s.current_price ? s.current_price / bvps : null;
  const fcfps = recentYear?.free_cash_flow_per_share ?? null;
  const fcfYield = fcfps && fcfps > 0 && s.current_price && s.current_price > 0
    ? (fcfps / s.current_price) * 100
    : null;

  if (model === "Financials") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Valuation — Financials</h4>
          <SectionHelp title="Valuation — Financial Sector">
            <p>Banks and financial companies have balance sheets where debt is a product, not a burden, so standard DCF and Graham Number models don't apply well. These metrics are more meaningful:</p>
            <p><span className="text-white font-medium">Price-to-Book (P/B)</span> — Market cap divided by book value (net assets). For banks, P/B below 1 means you're paying less than the company's stated net asset value. Historically, P/B below 1.5 is considered fair value; above 2.5 may be expensive.</p>
            <p><span className="text-white font-medium">Return on Equity (ROE)</span> — Net income divided by shareholders' equity. Measures how efficiently the company generates profit from its equity base. Above 15% is strong for a financial firm; below 8% is weak.</p>
            <p><span className="text-white font-medium">Debt-to-Equity</span> — Total debt divided by equity. For non-bank financials this signals leverage risk. Very high D/E (e.g. above 3) warrants scrutiny.</p>
            <p><span className="text-white font-medium">PEG Ratio</span> — Price-to-Earnings relative to EPS growth rate. Below 1 suggests undervaluation relative to growth; above 2 may be expensive. Less reliable for banks than for industrials.</p>
          </SectionHelp>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Price-to-Book"
            value={pb ? fmt(pb) + "×" : "N/A"}
            sub={pb ? (pb < 1 ? "Below book value" : pb < 1.5 ? "Fair value" : pb < 2.5 ? "Moderate premium" : "Expensive") : "Book value unavailable"}
            positive={pb ? (pb < 1.5 ? true : pb > 2.5 ? false : null) : null}
          />
          <StatCard
            label="Return on Equity"
            value={quality?.return_on_equity != null ? pct(quality.return_on_equity) : "N/A"}
            sub="Net income ÷ equity"
            positive={quality?.return_on_equity != null ? (quality.return_on_equity >= 0.15 ? true : quality.return_on_equity < 0.08 ? false : null) : null}
          />
          <StatCard
            label="Debt-to-Equity"
            value={quality?.debt_to_equity != null ? fmt(quality.debt_to_equity) + "×" : "N/A"}
            sub="Total debt ÷ equity"
            positive={quality?.debt_to_equity != null ? (quality.debt_to_equity < 1.0 ? true : quality.debt_to_equity > 3.0 ? false : null) : null}
          />
          <StatCard
            label="PEG Ratio"
            value={s.peg ? fmt(s.peg.peg_ratio) : "N/A"}
            sub={s.peg ? `P/E ${fmt(s.peg.pe_ratio)} / growth ${fmt(s.peg.earnings_growth_rate_pct)}%` : "Negative or zero growth"}
            positive={s.peg ? (s.peg.peg_ratio < 1 ? true : s.peg.peg_ratio > 2 ? false : null) : null}
          />
        </div>
      </div>
    );
  }

  if (model === "Real Estate") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Valuation — Real Estate</h4>
          <SectionHelp title="Valuation — Real Estate / REITs">
            <p>REITs (Real Estate Investment Trusts) distribute at least 90% of taxable income as dividends, so traditional earnings-based models like DCF are less meaningful. These metrics better reflect REIT value:</p>
            <p><span className="text-white font-medium">Price-to-Book (P/B)</span> — Price relative to net asset value (NAV) of the real estate holdings. REITs often trade at a premium or discount to their underlying property values. P/B near or below 1 may represent good value.</p>
            <p><span className="text-white font-medium">Dividend Yield</span> — Annual dividend divided by stock price, expressed as a percentage. REITs are required to pay out most earnings, so yield is a primary return driver. Yields above 4% are common; context matters — a very high yield may signal financial stress.</p>
            <p><span className="text-white font-medium">Payout Ratio</span> — Dividends paid as a fraction of earnings. For REITs, payout ratios above 60% are normal and expected. What matters is whether the dividend is growing and covered by funds from operations (FFO).</p>
            <p><span className="text-white font-medium">Debt-to-Equity</span> — Leverage is central to REIT analysis. REITs typically carry significant debt to finance property acquisitions. Moderate leverage amplifies returns; excessive leverage increases risk in rising rate environments.</p>
          </SectionHelp>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Price-to-Book"
            value={pb ? fmt(pb) + "×" : "N/A"}
            sub={pb ? (pb < 1 ? "Discount to NAV" : pb < 1.5 ? "Near NAV" : "Premium to NAV") : "Book value unavailable"}
            positive={pb ? (pb < 1.2 ? true : pb > 2.0 ? false : null) : null}
          />
          <StatCard
            label="Dividend Yield"
            value={dividend?.dividend_yield_pct != null ? `${fmt(dividend.dividend_yield_pct, 1)}%` : "N/A"}
            sub={dividend?.dividend_per_share != null ? `$${fmt(dividend.dividend_per_share, 2)}/share` : "No dividend data"}
            positive={dividend?.dividend_yield_pct != null ? (dividend.dividend_yield_pct >= 3 ? true : null) : null}
          />
          <StatCard
            label="Payout Ratio"
            value={dividend?.payout_ratio != null ? pct(dividend.payout_ratio) : "N/A"}
            sub={dividend?.is_sustainable != null ? (dividend.is_sustainable ? "Sustainable (<60%)" : "High (>60%)") : "of earnings"}
            positive={dividend?.payout_ratio != null ? (dividend.payout_ratio < 0.90 ? true : false) : null}
          />
          <StatCard
            label="Debt-to-Equity"
            value={quality?.debt_to_equity != null ? fmt(quality.debt_to_equity) + "×" : "N/A"}
            sub="Total debt ÷ equity"
            positive={quality?.debt_to_equity != null ? (quality.debt_to_equity < 2.0 ? true : quality.debt_to_equity > 4.0 ? false : null) : null}
          />
        </div>
      </div>
    );
  }

  if (model === "Energy") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Valuation — Energy</h4>
          <SectionHelp title="Valuation — Energy Sector">
            <p>Energy companies are capital intensive with earnings tied to commodity price cycles, making traditional DCF less stable. Analysts emphasize cash generation and asset value:</p>
            <p><span className="text-white font-medium">FCF Yield</span> — Free cash flow per share divided by stock price, expressed as a percentage. This shows how much cash the company generates relative to what you pay. Energy companies with high FCF yield can return cash to shareholders through buybacks and dividends even in low price environments. Above 5% is generally considered attractive.</p>
            <p><span className="text-white font-medium">Price-to-Book (P/B)</span> — Price relative to the book value of assets (refineries, pipelines, reserves). Energy companies are asset-heavy, so P/B reflects whether you're paying a premium over replacement cost. Below 1.5 is considered fair for most energy companies.</p>
            <p><span className="text-white font-medium">PEG Ratio</span> — Price-to-Earnings relative to growth rate. Useful in periods of expanding earnings; less reliable during commodity downturns when EPS can swing dramatically.</p>
            <p><span className="text-white font-medium">Intrinsic Value (DCF)</span> — Simplified DCF estimate. Use as a rough reference only — energy DCF depends heavily on commodity price assumptions which are not modeled here.</p>
          </SectionHelp>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="FCF Yield"
            value={fcfYield != null ? `${fmt(fcfYield, 1)}%` : "N/A"}
            sub="FCF/share ÷ price"
            positive={fcfYield != null ? (fcfYield >= 5 ? true : fcfYield < 1 ? false : null) : null}
          />
          <StatCard
            label="Price-to-Book"
            value={pb ? fmt(pb) + "×" : "N/A"}
            sub={pb ? (pb < 1 ? "Below book value" : pb < 1.5 ? "Fair value" : "Premium") : "Book value unavailable"}
            positive={pb ? (pb < 1.5 ? true : pb > 3.0 ? false : null) : null}
          />
          <StatCard
            label="PEG Ratio"
            value={s.peg ? fmt(s.peg.peg_ratio) : "N/A"}
            sub={s.peg ? `P/E ${fmt(s.peg.pe_ratio)} / growth ${fmt(s.peg.earnings_growth_rate_pct)}%` : "Negative or zero growth"}
            positive={s.peg ? (s.peg.peg_ratio < 1 ? true : s.peg.peg_ratio > 2 ? false : null) : null}
          />
          <StatCard
            label="Intrinsic Value"
            value={s.intrinsic_value ? `$${fmt(s.intrinsic_value.estimated_intrinsic_value)}` : "N/A"}
            sub={s.intrinsic_value ? "DCF estimate (rough)" : "Negative or zero EPS growth"}
          />
        </div>
      </div>
    );
  }

  if (model === "Dividend") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Valuation — Dividend</h4>
          <SectionHelp title="Valuation — Consumer Staples & Utilities">
            <p>Consumer staples and utilities are often held for their stable, growing dividends and defensive characteristics rather than growth. Investors use a blend of income and value metrics:</p>
            <p><span className="text-white font-medium">Dividend Yield</span> — Annual dividend divided by stock price. For staples and utilities, yield is a primary component of total return. Yields in the 2–4% range are typical; above 4% may indicate undervaluation or elevated risk.</p>
            <p><span className="text-white font-medium">Payout Ratio</span> — Dividends as a fraction of earnings. A payout ratio below 60% suggests the dividend is well-covered and has room to grow. Above 80% may indicate the dividend is stretched and could be cut if earnings fall.</p>
            <p><span className="text-white font-medium">PEG Ratio</span> — Useful here because staples and utilities often grow slowly but steadily. A low P/E relative to even modest growth (PEG under 1.5) can indicate good value for defensive investors.</p>
            <p><span className="text-white font-medium">Intrinsic Value (DCF)</span> — Discounted cash flow estimate. More applicable here than for cyclical sectors because earnings are relatively predictable. The margin of safety price (50% of intrinsic value) provides a conservative buy target.</p>
          </SectionHelp>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Dividend Yield"
            value={dividend?.dividend_yield_pct != null ? `${fmt(dividend.dividend_yield_pct, 1)}%` : "N/A"}
            sub={dividend?.dividend_growth_rate_1yr != null ? `1yr growth ${pct(dividend.dividend_growth_rate_1yr)}` : (dividend?.dividend_per_share != null ? `$${fmt(dividend.dividend_per_share, 2)}/share` : "No dividend")}
            positive={dividend?.dividend_yield_pct != null ? (dividend.dividend_yield_pct >= 2 ? true : null) : null}
          />
          <StatCard
            label="Payout Ratio"
            value={dividend?.payout_ratio != null ? pct(dividend.payout_ratio) : "N/A"}
            sub={dividend?.is_sustainable != null ? (dividend.is_sustainable ? "Sustainable (<60%)" : "High payout (>60%)") : "of earnings"}
            positive={dividend?.payout_ratio != null ? (dividend.payout_ratio < 0.60 ? true : dividend.payout_ratio > 0.80 ? false : null) : null}
          />
          <StatCard
            label="PEG Ratio"
            value={s.peg ? fmt(s.peg.peg_ratio) : "N/A"}
            sub={s.peg ? `P/E ${fmt(s.peg.pe_ratio)} / growth ${fmt(s.peg.earnings_growth_rate_pct)}%` : "Negative or zero growth"}
            positive={s.peg ? (s.peg.peg_ratio < 1.5 ? true : s.peg.peg_ratio > 2.5 ? false : null) : null}
          />
          <StatCard
            label="Intrinsic Value"
            value={s.intrinsic_value ? `$${fmt(s.intrinsic_value.estimated_intrinsic_value)}` : "N/A"}
            sub={s.intrinsic_value ? `Safety price $${fmt(s.intrinsic_value.margin_of_safety_price)}` : "Negative or zero EPS growth"}
          />
        </div>
      </div>
    );
  }

  // Standard model — Technology, Healthcare, Communication, Industrials, Materials, Consumer Discretionary
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Valuation</h4>
        <SectionHelp title="Valuation Estimates">
          <p>These are estimates of what a stock may be <span className="text-white">worth</span> based on fundamentals — not what it is currently trading at.</p>
          <p><span className="text-white font-medium">Intrinsic Value (DCF)</span> — Discounted Cash Flow. Projects earnings per share (EPS) 10 years forward at the historical growth rate, applies a growth-adjusted P/E ratio, then discounts the result back to today at a 15% required return. This is a simplified version of a standard DCF model. Use as a rough reference alongside other signals.</p>
          <p><span className="text-white font-medium">Margin of Safety</span> — 50% of the intrinsic value estimate. Benjamin Graham, the father of value investing, recommended buying at a significant discount to intrinsic value to protect against errors in the estimate. This is that buffer price.</p>
          <p><span className="text-white font-medium">Graham Number</span> — A conservative valuation formula: √(22.5 × EPS × Book Value Per Share). It assumes a fair P/E of 15 and a fair Price-to-Book of 1.5. Works best for stable, asset-heavy companies. High-growth tech and healthcare stocks routinely trade far above their Graham Number, which is expected.</p>
          <p><span className="text-white font-medium">PEG Ratio</span> — Price-to-Earnings divided by the annual EPS growth rate. A PEG below 1 suggests the stock may be undervalued relative to its growth; above 2 may be overvalued. Invented by Peter Lynch as a quick check on growth-stock valuation.</p>
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

  const qualityQ = useQuery<QualityScoreResponse, Error>({
    queryKey: ["quality", ticker],
    queryFn: () => stock.quality(ticker!),
    enabled: !!ticker,
    retry: false,
  });

  const dividendQ = useQuery<DividendMetricsResponse, Error>({
    queryKey: ["dividends", ticker],
    queryFn: () => stock.dividends(ticker!),
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

  // Only show data when the response ticker matches the selected ticker.
  // Without this guard, React Query briefly surfaces a previously cached result
  // for a different ticker while the new request is in-flight.
  const s = summaryQ.data?.ticker === ticker ? summaryQ.data : undefined;
  const p = piotroskiQ.data?.ticker === ticker ? piotroskiQ.data : undefined;

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

      {/* Loading — shown on first load and when switching tickers */}
      {(summaryQ.isLoading || (summaryQ.isFetching && !s)) && (
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
              {s.current_price != null && (() => {
                const sector = profileQ.data?.sector;
                if (!usesDcfValuation(sector)) {
                  // Financials / Real Estate — show P/B instead of DCF/Graham
                  const bvps = s.graham_number?.book_value_per_share ?? null;
                  const pb = bvps && bvps > 0 ? s.current_price / bvps : null;
                  if (pb == null) return null;
                  return (
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>
                        P/B {pb.toFixed(2)}x{" "}
                        <span className={pb <= 1.0 ? "text-emerald-400" : pb <= 1.5 ? "text-amber-400" : "text-gray-400"}>
                          {pb <= 1.0 ? "▼ below book value" : pb <= 1.5 ? "▼ near book value" : "▲ above book value"}
                        </span>
                      </span>
                    </div>
                  );
                }
                // Standard / Energy / Dividend — show intrinsic & Graham
                if (!s.intrinsic_value && !s.graham_number) return null;
                return (
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
                );
              })()}
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
              <div>
                <h4 className="text-sm font-semibold text-gray-300">Score Overview</h4>
                {profileQ.data?.sector && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {sectorModelName(profileQ.data.sector)} scoring model
                  </p>
                )}
              </div>
              <SectionHelp title="Score Overview">
                <p>Quick-glance signals that adapt to the company's sector model. Gauges shown vary by sector:</p>
                <p><span className="text-white font-medium">Momentum (0–100)</span> — price performance vs the S&P 500 over 3, 6, and 12 months. Above 50 means outperforming. Shown for all sectors.</p>
                <p><span className="text-white font-medium">Piotroski F-Score (0–9)</span> — accounting health across 9 signals. Shown for Standard and Energy sectors only. Not applicable to banks or REITs.</p>
                <p><span className="text-white font-medium">PEG Ratio</span> — P/E divided by EPS growth. Shown for Standard and Energy sectors.</p>
                <p><span className="text-white font-medium">Return on Equity</span> — shown for Financials. Above 15% is strong for a bank; below 8% is weak.</p>
                <p><span className="text-white font-medium">Price/Book</span> — price relative to net asset value. Shown for Financials and Real Estate, where asset value is the primary valuation anchor. Below 1.0 means trading below book value.</p>
                <p><span className="text-white font-medium">Debt Safety</span> — debt-to-equity tiered score. Shown for Financials and Real Estate, where leverage is a key risk factor.</p>
                <p><span className="text-white font-medium">Dividend Yield</span> — shown for Real Estate and Dividend sectors, where income is the primary return driver.</p>
              </SectionHelp>
            </div>
            <div className="flex gap-6 flex-wrap">
              {(() => {
                const model = sectorModelName(profileQ.data?.sector);
                const bvps = s.graham_number?.book_value_per_share ?? null;
                const pb = bvps && bvps > 0 && s.current_price ? s.current_price / bvps : null;
                const de = qualityQ.data?.debt_to_equity ?? null;

                if (model === "Financials") {
                  const roe = qualityQ.data?.return_on_equity;
                  const roeScore = roe != null ? (roe >= 0.20 ? 90 : roe >= 0.15 ? 70 : roe >= 0.10 ? 50 : roe >= 0.07 ? 30 : 10) : null;
                  return <>
                    {roeScore != null && <ScoreGauge score={roeScore} label="ROE" />}
                    {pbScore(pb) != null && <ScoreGauge score={pbScore(pb)!} label="Price/Book" />}
                    <ScoreGauge score={s.momentum.momentum_score} label="Momentum" />
                    {debtSafetyScore(de) != null && <ScoreGauge score={debtSafetyScore(de)!} label="Debt Safety" />}
                  </>;
                }

                if (model === "Real Estate") {
                  const yld = dividendQ.data?.dividend_yield_pct;
                  const yldScore = yld != null && yld > 0 ? (yld >= 5 ? 90 : yld >= 4 ? 75 : yld >= 3 ? 55 : yld >= 2 ? 35 : 15) : null;
                  return <>
                    {yldScore != null && <ScoreGauge score={yldScore} label="Div Yield" />}
                    {pbScore(pb) != null && <ScoreGauge score={pbScore(pb)!} label="Price/Book" />}
                    <ScoreGauge score={s.momentum.momentum_score} label="Momentum" />
                    {debtSafetyScore(de) != null && <ScoreGauge score={debtSafetyScore(de)!} label="Debt Safety" />}
                  </>;
                }

                // Dividend sectors
                if (model === "Dividend") {
                  const yld = dividendQ.data?.dividend_yield_pct;
                  const yldScore = yld != null && yld > 0 ? (yld >= 5 ? 90 : yld >= 4 ? 75 : yld >= 3 ? 55 : yld >= 2 ? 35 : 15) : null;
                  return <>
                    <ScoreGauge score={s.momentum.momentum_score} label="Momentum" />
                    {p && <ScoreGauge score={p.score} max={9} label="Piotroski" />}
                    {yldScore != null && <ScoreGauge score={yldScore} label="Div Yield" />}
                  </>;
                }

                // Standard / Energy
                return <>
                  <ScoreGauge score={s.momentum.momentum_score} label="Momentum" />
                  {p && usesPiotroski(profileQ.data?.sector) && (
                    <ScoreGauge score={p.score} max={9} label="Piotroski" />
                  )}
                  {s.peg && (
                    <ScoreGauge
                      score={s.peg.peg_ratio < 1 ? 80 : s.peg.peg_ratio < 2 ? 50 : 20}
                      label="PEG"
                    />
                  )}
                </>;
              })()}
            </div>
          </div>

          {/* Valuation — sector-aware */}
          <ValuationSection
            sector={profileQ.data?.sector}
            s={s}
            quality={qualityQ.data}
            dividend={dividendQ.data}
          />

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

          {/* Piotroski — hidden for Financials / Real Estate */}
          {p && usesPiotroski(profileQ.data?.sector) && (
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
