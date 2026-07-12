import { useState, useMemo } from "react";
import { BookOpen, Search } from "lucide-react";

type Category =
  | "core"
  | "acronyms"
  | "screening"
  | "models"
  | "piotroski"
  | "portfolio"
  | "momentum";

interface Term {
  id: string;
  term: string;
  category: Category;
  short: string;
  detail?: string;
  formula?: string;
}

const CATEGORIES: { id: Category | "all"; label: string; color: string }[] = [
  { id: "all",        label: "All",             color: "bg-gray-700 text-gray-200 border-gray-600" },
  { id: "core",       label: "Core Metrics",    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "acronyms",   label: "Acronyms",        color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "screening",  label: "Screening",       color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "models",     label: "Sector Models",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "piotroski",  label: "Piotroski",       color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "portfolio",  label: "Portfolio",       color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "momentum",   label: "Growth & Momentum", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
];

function categoryStyle(cat: Category): string {
  const found = CATEGORIES.find((c) => c.id === cat);
  return found ? found.color : "bg-gray-700 text-gray-200 border-gray-600";
}

function categoryLabel(cat: Category): string {
  const found = CATEGORIES.find((c) => c.id === cat);
  return found ? found.label : cat;
}

const TERMS: Term[] = [
  // ── Core Metrics ────────────────────────────────────────────────────────────
  {
    id: "dcf",
    term: "DCF — Discounted Cash Flow Intrinsic Value",
    category: "core",
    short: "An estimate of what a stock is worth today based on its projected future earnings.",
    detail:
      "We take the company's most recent Earnings Per Share (EPS) and compound it forward 10 years at its historical growth rate. That future EPS is then multiplied by a growth-adjusted P/E ratio to get a projected price 10 years from now, which is discounted back to today at a 15% required annual return. The result is the estimated intrinsic value. The Margin of Safety price is set at 50% of that figure — following Benjamin Graham's principle that buying at a significant discount protects against estimation error.",
    formula: "Future EPS = EPS × (1 + growth_rate)^10\nFuture Price = Future EPS × growth-adjusted P/E\nIntrinsic Value = Future Price ÷ (1.15)^10\nMargin of Safety = Intrinsic Value × 0.50",
  },
  {
    id: "graham-number",
    term: "Graham Number",
    category: "core",
    short: "A conservative upper-bound fair value derived from earnings and book value, developed by Benjamin Graham.",
    detail:
      "The formula assumes a stock should trade at no more than 15× earnings (P/E ≤ 15) and no more than 1.5× book value (P/B ≤ 1.5). Multiplying those two constraints together gives the constant 22.5. A stock trading below its Graham Number is traditionally considered to offer a margin of safety. We use it in the Discovery screener instead of DCF because DCF's 10-year compounding produces unstable results across a broad small/mid-cap universe — Graham Number's simpler formula stays far more bounded.",
    formula: "Graham Number = √(22.5 × EPS × BVPS)",
  },
  {
    id: "piotroski",
    term: "Piotroski F-Score",
    category: "core",
    short: "A 0–9 point score measuring the accounting health and financial momentum of a company across nine binary signals.",
    detail:
      "Each of the nine signals contributes exactly 1 point. A score of 7–9 signals strong fundamental health; 4–6 is moderate; 0–3 suggests weakness. The score covers three dimensions: Profitability (F1–F4), Leverage / Liquidity (F5–F7), and Operating Efficiency (F8–F9). See the Piotroski category for each individual signal.",
  },
  {
    id: "composite-score",
    term: "Composite Score",
    category: "core",
    short: "A single 0–100 ranking number for each stock that blends four sector-specific signals with fixed weights.",
    detail:
      "The weights and signals change per sector model (see Sector Models). For example, the Standard model uses Piotroski (30%), Business Quality (25%), DCF Value Signal (25%), and Momentum vs SPY (20%). A score ≥ 70 earns a 'High' tier; 55–69 is 'Above Average'; 40–54 is 'Average'; below 40 is 'Below Average'. These tiers are for relative comparison within a sector — not a buy/sell recommendation.",
  },
  {
    id: "quality-score",
    term: "Quality Score",
    category: "core",
    short: "A 0–100 score measuring the underlying business quality of a company based on profitability and returns.",
    detail:
      "Combines Return on Equity (ROE), Return on Invested Capital (ROIC), gross margin trends, and earnings consistency into a single score. Used as a factor in both the sector screener (Standard and Dividend models) and as one of the three quality-floor checks in the Discovery screener.",
  },
  {
    id: "debt-safety",
    term: "Debt Safety Score",
    category: "core",
    short: "A 0–100 score based on the company's debt-to-equity ratio — higher means the balance sheet is safer.",
    detail:
      "Tiered scoring: very low D/E ratios score near 100; ratios above 3× score near 0. For Financial Services companies, moderate leverage (D/E 1–3×) is expected and scored differently than it would be for an industrial firm. Used as a factor in the Financials and Real Estate sector models and as a quality-floor check in Discovery.",
  },
  {
    id: "momentum-score",
    term: "Momentum Score",
    category: "core",
    short: "A 0–100 score comparing the stock's price performance against the S&P 500 (SPY) over 3, 6, and 12 months.",
    detail:
      "A score of 50 means the stock has matched SPY exactly. Above 50 means it has outperformed; below 50 means it has underperformed. The three time periods are blended into one score. Momentum is used as a factor in every sector model to capture whether the market is currently rewarding or punishing the stock.",
  },
  {
    id: "margin-of-safety",
    term: "Margin of Safety",
    category: "core",
    short: "50% of the DCF intrinsic value — the price at which Benjamin Graham considered a stock to offer sufficient protection against estimation error.",
    detail:
      "If intrinsic value is estimated at $100, the Margin of Safety price is $50. Buying at a 50% discount provides a large buffer if growth assumptions prove too optimistic or the business faces unexpected headwinds. This concept originated with Benjamin Graham and was popularized by Warren Buffett.",
    formula: "Margin of Safety Price = Intrinsic Value × 0.50",
  },
  {
    id: "peg",
    term: "PEG Ratio",
    category: "core",
    short: "Price-to-Earnings divided by annual EPS growth rate — adjusts the P/E ratio for expected earnings growth.",
    detail:
      "A PEG of 1.0 is often considered fair value: you're paying $1 of P/E for every 1% of growth. Below 1.0 may suggest undervaluation relative to growth; above 2.0 may indicate the market is pricing in optimistic expectations. Unlike P/E alone, PEG accounts for the fact that a fast-growing company can justify a higher price.",
    formula: "PEG = P/E Ratio ÷ Annual EPS Growth Rate (%)",
  },
  {
    id: "fcf-yield",
    term: "FCF Yield Score",
    category: "core",
    short: "A 0–100 score based on the ratio of free cash flow per share to stock price — used in the Energy sector model.",
    detail:
      "FCF Yield = FCF per Share ÷ Stock Price. A yield above 5% scores well (near 100); below 1% scores poorly (near 0). Energy companies are cash-intensive businesses where earnings can be distorted by depreciation and commodity cycles — FCF is a more reliable measure of what cash the business actually generates.",
    formula: "FCF Yield = FCF per Share ÷ Current Price",
  },
  {
    id: "dividend-quality",
    term: "Dividend Quality Score",
    category: "core",
    short: "A 0–100 score measuring dividend sustainability and yield — used in the Consumer Staples, Utilities, and Real Estate models.",
    detail:
      "Combines dividend yield (higher is better up to a point) with payout ratio (lower is safer — room to grow the dividend). A payout ratio above 80% is flagged as stretched; below 60% is considered sustainable. For REITs, higher payout ratios are expected and scored accordingly since REITs are required to distribute at least 90% of taxable income.",
  },

  // ── Acronyms & Ratios ────────────────────────────────────────────────────────
  {
    id: "eps",
    term: "EPS — Earnings Per Share",
    category: "acronyms",
    short: "A company's net profit divided by its total number of outstanding shares.",
    detail:
      "EPS is the most widely used measure of company profitability on a per-share basis. It feeds directly into the DCF intrinsic value calculation, the Graham Number, and the PEG ratio. We track 1-year, 5-year, and 10-year CAGR of EPS to gauge whether earnings are growing consistently.",
    formula: "EPS = Net Income ÷ Shares Outstanding",
  },
  {
    id: "bvps",
    term: "BVPS — Book Value Per Share",
    category: "acronyms",
    short: "The net asset value of a company divided by its shares outstanding — what shareholders would theoretically receive if the company were liquidated.",
    detail:
      "Book value equals total assets minus total liabilities. BVPS is the per-share equivalent. It's the second input in the Graham Number formula and a key input for the Price-to-Book (P/B) ratio used in Financials and Real Estate sector models. Growing BVPS over time signals that the company is retaining earnings and building shareholder value.",
    formula: "BVPS = (Total Assets − Total Liabilities) ÷ Shares Outstanding",
  },
  {
    id: "roic",
    term: "ROIC — Return on Invested Capital",
    category: "acronyms",
    short: "How efficiently a company converts invested capital (debt + equity) into after-tax operating profit.",
    detail:
      "ROIC above 10% is generally considered good; above 15% is excellent. It's a better measure of operational efficiency than ROE because it accounts for all capital sources, not just equity. Consistently high ROIC is associated with durable competitive advantages (moats). We track ROIC CAGR over multiple years as part of the Quality Score.",
    formula: "ROIC = NOPAT ÷ Invested Capital",
  },
  {
    id: "roe",
    term: "ROE — Return on Equity",
    category: "acronyms",
    short: "Net income as a percentage of shareholders' equity — measures how efficiently a company generates profit from equity financing.",
    detail:
      "Used as the primary signal in the Financials sector model (ROE Quality Score). For financial companies like banks and insurers, ROE is more meaningful than ROIC because their business model relies on leveraged equity rather than invested capital in the traditional sense. ROE ≥ 15% is considered strong for a financial firm; below 8% is weak.",
    formula: "ROE = Net Income ÷ Shareholders' Equity",
  },
  {
    id: "roa",
    term: "ROA — Return on Assets",
    category: "acronyms",
    short: "Net income as a percentage of total assets — used in the Piotroski F-Score to assess profitability (F1) and improvement (F3).",
    formula: "ROA = Net Income ÷ Total Assets",
  },
  {
    id: "fcf",
    term: "FCF — Free Cash Flow",
    category: "acronyms",
    short: "The cash a business generates after paying for operating expenses and capital expenditures — what's left to return to shareholders or reinvest.",
    detail:
      "FCF is often considered more reliable than net income because it's harder to manipulate with accounting adjustments. A company can report positive earnings while generating negative free cash flow, which is a warning sign. FCF per share is one of the five fundamentals metrics we track over time.",
    formula: "FCF = Operating Cash Flow − Capital Expenditures",
  },
  {
    id: "ocf",
    term: "OCF — Operating Cash Flow",
    category: "acronyms",
    short: "Cash generated from normal business operations, before capital expenditures.",
    detail:
      "Used in Piotroski signal F2 (positive OCF signals the business is self-sustaining) and in F4 (comparing OCF to net income to check accrual quality). Positive OCF alongside positive net income is a healthy signal; positive earnings with negative OCF suggests earnings may be inflated by accounting adjustments.",
  },
  {
    id: "cagr",
    term: "CAGR — Compound Annual Growth Rate",
    category: "acronyms",
    short: "The steady annual rate at which a metric grows over a given period, assuming compounding.",
    detail:
      "We display CAGR for Revenue, EPS, BVPS, FCF per share, and ROIC over 1-year, 5-year, and 10-year periods. CAGR smooths out year-to-year volatility and gives a cleaner picture of long-term trend. A positive 5-year CAGR means the metric has been growing on average each year over that period.",
    formula: "CAGR = (Ending Value ÷ Starting Value)^(1 ÷ Years) − 1",
  },
  {
    id: "pb",
    term: "P/B — Price-to-Book Ratio",
    category: "acronyms",
    short: "Market price per share divided by book value per share — how much investors are paying relative to the company's net assets.",
    detail:
      "P/B < 1 means the stock trades below its liquidation value, which can indicate undervaluation or distress. P/B 1.0–1.5 is considered fair value in the Financials and Real Estate models. P/B > 2.5 may indicate the market is pricing in significant growth expectations. For REITs, P/B above 1.0 is called a 'premium to NAV'; below 1.0 is a 'discount to NAV.'",
    formula: "P/B = Current Price ÷ BVPS",
  },
  {
    id: "pe",
    term: "P/E — Price-to-Earnings Ratio",
    category: "acronyms",
    short: "Market price per share divided by earnings per share — how much investors pay for each dollar of earnings.",
    detail:
      "P/E is the most widely used valuation multiple. It's an input in the PEG ratio and in the DCF model (growth-adjusted P/E). A high P/E can mean the market expects strong future growth or that the stock is expensive; a low P/E can mean value or a declining business. Context and growth rate matter — which is why PEG adjusts P/E for growth.",
    formula: "P/E = Current Price ÷ EPS",
  },
  {
    id: "pl",
    term: "P&L — Profit & Loss",
    category: "acronyms",
    short: "The total gain or loss on your portfolio — the sum of all realized and unrealized gains and losses.",
    detail:
      "In the Portfolio section, combined P&L = Realized Gains (from positions you've already sold) + Unrealized Gains (the current gain or loss on positions you still hold). Unrealized gains become realized when you sell. P&L is expressed both in dollar terms and as a percentage of your total cost basis.",
  },
  {
    id: "spy",
    term: "SPY — S&P 500 ETF",
    category: "acronyms",
    short: "The SPDR S&P 500 ETF Trust — used throughout the app as the benchmark for US stock market performance.",
    detail:
      "SPY tracks the S&P 500 index, which represents approximately 500 of the largest US-listed companies weighted by market cap. We use SPY's historical price data to calculate relative strength: a stock's 3-, 6-, and 12-month returns compared to SPY's returns over the same periods. Outperforming SPY contributes positively to the Momentum Score.",
  },
  {
    id: "nav",
    term: "NAV — Net Asset Value",
    category: "acronyms",
    short: "The underlying value of a company's assets minus its liabilities — used specifically in the Real Estate (REIT) context as a proxy for book value.",
    detail:
      "For REITs, NAV reflects the market value of the underlying real estate holdings. A stock trading at a P/B above 1.0 is at a 'premium to NAV' — investors expect the portfolio to appreciate or the REIT to grow. Below 1.0 is a 'discount to NAV' — potentially undervalued, or the market is skeptical about the property values.",
  },
  {
    id: "ffo",
    term: "FFO — Funds From Operations",
    category: "acronyms",
    short: "A cash earnings metric used for REITs that adds back depreciation to net income — a better measure of dividend-paying capacity than EPS.",
    detail:
      "REITs own physical real estate that depreciates on the income statement, but property values don't necessarily decline — they often appreciate. FFO corrects for this by adding depreciation back to net income. Payout ratio for REITs is often calculated against FFO rather than EPS to give a more accurate picture of dividend sustainability.",
    formula: "FFO = Net Income + Depreciation − Gains on Property Sales",
  },
  {
    id: "fmp",
    term: "FMP — Financial Modeling Prep",
    category: "acronyms",
    short: "Our primary financial data provider — supplies income statements, balance sheets, cash flow statements, ratios, key metrics, and price history.",
    detail:
      "FMP's stable API is used for the sector screener's large-cap universe, the Discovery screener's small/mid-cap candidate pool, and as a fallback for all individual stock analysis. For US-listed stocks, SEC EDGAR is used as the primary fundamentals source where available, with FMP filling gaps.",
  },

  // ── Screening & Discovery ────────────────────────────────────────────────────
  {
    id: "large-cap",
    term: "Large Cap",
    category: "screening",
    short: "Companies with a market capitalization of $10 billion or more — the universe screened by the Sector Screener.",
    detail:
      "The Sector Screener pulls a large-cap candidate list from FMP for each sector, limited to the top names by market cap. These are established companies with mature financials and generally reliable reporting. The candidate pool is pre-filtered before scoring so that the composite ranking compares like-with-like within a size band.",
  },
  {
    id: "discovery",
    term: "Discovery Screener",
    category: "screening",
    short: "A separate screener for small- and mid-cap stocks ($300M–$5B market cap) that are trading near their Graham Number with fundamentals above a quality floor.",
    detail:
      "Discovery surfaces names that the Sector Screener never sees — they're too small to enter the large-cap universe. The approach is different too: rather than ranking by a composite score, Discovery filters for candidates that clear a minimum quality bar (quality floor) and are trading within ±20% of their Graham Number. Results are sorted by closeness to Graham Number, not overall score.",
  },
  {
    id: "quality-floor",
    term: "Quality Floor",
    category: "screening",
    short: "The minimum set of fundamental thresholds a Discovery candidate must pass to appear in results.",
    detail:
      "A stock must clear all three checks to qualify: Quality Score ≥ 40, Debt Safety Score ≥ 40, and Piotroski F-Score ≥ 4. These thresholds are deliberately set low — just enough to exclude companies in financial distress, not to require best-in-class fundamentals. If the data needed to evaluate a threshold is missing from both EDGAR and FMP, the candidate is included anyway with a data-gap warning rather than silently excluded.",
  },
  {
    id: "deviation-band",
    term: "Deviation Band (±20%)",
    category: "screening",
    short: "The maximum distance a stock's current price can be from its Graham Number to qualify for Discovery results.",
    detail:
      "We surface stocks within ±20% of their Graham Number — both below (potentially undervalued) and above (slightly overvalued). Both directions are included because the Graham Number formula tends to be conservative for asset-light, high-growth businesses — a stock slightly above its Graham Number may still be reasonably priced in those cases. Deviation is shown on every Discovery card so you can see exactly where the stock sits.",
    formula: "Deviation % = (Current Price − Graham Number) ÷ Graham Number × 100",
  },
  {
    id: "market-cap-band",
    term: "Market Cap Band ($300M–$5B)",
    category: "screening",
    short: "The market capitalisation range used to define the small- and mid-cap universe in the Discovery screener.",
    detail:
      "Small-cap is conventionally $300M–$2B; mid-cap is $2B–$10B. We use $300M–$5B to capture both segments while avoiding micro-caps (below $300M), where data quality and liquidity are far less reliable. FMP's company screener is queried in eight equal sub-ranges across this band to ensure broad coverage rather than clustering at the top of the range.",
  },
  {
    id: "score-tier",
    term: "Score Tier",
    category: "screening",
    short: "A qualitative label assigned to each stock in the Sector Screener based on its Composite Score.",
    detail:
      "High: Composite Score ≥ 70. Above Average: 55–69. Average: 40–54. Below Average: below 40. Tiers are color-coded (emerald / blue / amber / gray) for quick scanning. They reflect relative ranking within a sector on a given day — not an absolute quality judgment or a buy/sell recommendation.",
  },
  {
    id: "near-miss",
    term: "Near-Miss",
    category: "screening",
    short: "Informal term for a Discovery candidate — a stock that is close to (but not necessarily below) its Graham Number with passable fundamentals.",
    detail:
      "The name captures the idea that these stocks haven't been 'discovered' by the large-cap screener (they're too small) and are near a traditional value threshold without necessarily being deeply undervalued. The goal is to surface overlooked names worth investigating further, not to guarantee a margin of safety.",
  },

  // ── Sector Models ────────────────────────────────────────────────────────────
  {
    id: "model-standard",
    term: "Standard Sector Model",
    category: "models",
    short: "The default scoring model for Technology, Healthcare, Communication, Industrials, Materials, and Consumer Discretionary.",
    detail:
      "Weights: Piotroski F-Score 30% · Business Quality 25% · DCF Value Signal 25% · Momentum vs SPY 20%. This balanced model emphasises accounting health and quality alongside valuation and price trend. DCF intrinsic value is meaningful for these sectors because earnings are relatively predictable and comparable across companies.",
  },
  {
    id: "model-financials",
    term: "Financials Sector Model",
    category: "models",
    short: "Specialised model for banks, insurers, and financial services companies.",
    detail:
      "Weights: ROE Quality 35% · Price-to-Book Value 25% · Momentum vs SPY 25% · Debt Safety 15%. DCF and Graham Number are excluded — they assume consistent FCF and book value relationships that don't hold for companies where debt is a product, not a risk. ROE and P/B are the standard metrics analysts use to compare financial firms. High D/E ratios (e.g., >3) are expected at banks but warrant scrutiny at non-bank financials.",
  },
  {
    id: "model-realestate",
    term: "Real Estate Sector Model",
    category: "models",
    short: "Specialised model for REITs and real estate companies.",
    detail:
      "Weights: Dividend Quality 35% · Price-to-Book (NAV) 25% · Momentum vs SPY 25% · Debt Safety 15%. REITs are required by law to distribute at least 90% of taxable income as dividends, making yield and payout sustainability the primary valuation lens. P/B reflects whether the stock trades at a premium or discount to the underlying property value (NAV). DCF is excluded because depreciation-heavy accounting distorts REIT earnings — FFO is more relevant.",
  },
  {
    id: "model-energy",
    term: "Energy Sector Model",
    category: "models",
    short: "Specialised model for oil, gas, and energy companies.",
    detail:
      "Weights: Piotroski F-Score 25% · FCF Yield 30% · Momentum vs SPY 30% · Business Quality 15%. Energy earnings are highly sensitive to commodity price cycles — FCF Yield is more stable than reported EPS for assessing value. Momentum is weighted more heavily than in other models because commodity price trends tend to persist. P/B is relevant since energy assets (reserves, infrastructure) have tangible replacement cost.",
  },
  {
    id: "model-dividend",
    term: "Dividend Sector Model",
    category: "models",
    short: "Model for Consumer Staples and Utilities — sectors held primarily for income and stability.",
    detail:
      "Weights: Dividend Quality 30% · Business Quality 25% · DCF Value 25% · Momentum vs SPY 20%. These defensive sectors attract investors seeking income rather than growth. Dividend yield, payout sustainability, and quality of earnings dominate the scoring. DCF is still included because staples and utilities have relatively predictable earnings trajectories.",
  },

  // ── Piotroski F-Score Signals ────────────────────────────────────────────────
  {
    id: "f1",
    term: "F1 — ROA Positive (Profitability)",
    category: "piotroski",
    short: "Scores 1 if the company is profitable — Return on Assets is positive.",
    formula: "ROA = Net Income ÷ Total Assets > 0",
  },
  {
    id: "f2",
    term: "F2 — OCF Positive (Profitability)",
    category: "piotroski",
    short: "Scores 1 if the business generates real cash — Operating Cash Flow is positive.",
    detail: "Positive OCF alongside positive earnings confirms that income is backed by actual cash receipts, not just accounting entries.",
  },
  {
    id: "f3",
    term: "F3 — ROA Increasing (Profitability)",
    category: "piotroski",
    short: "Scores 1 if profitability is improving year-over-year — this year's ROA exceeds last year's.",
  },
  {
    id: "f4",
    term: "F4 — Low Accruals / Accrual Quality (Profitability)",
    category: "piotroski",
    short: "Scores 1 if cash earnings are close to reported earnings — Operating Cash Flow exceeds Net Income.",
    detail:
      "When a company reports high earnings but low cash flow, the gap is made up by accounting accruals — adjustments that can be manipulated or reversed. OCF > Net Income suggests earnings quality is high and less dependent on estimates.",
    formula: "Pass if OCF ÷ Total Assets > ROA",
  },
  {
    id: "f5",
    term: "F5 — Leverage Decreasing (Leverage)",
    category: "piotroski",
    short: "Scores 1 if the balance sheet is getting stronger — the long-term debt ratio has decreased year-over-year.",
  },
  {
    id: "f6",
    term: "F6 — Current Ratio Improving (Leverage)",
    category: "piotroski",
    short: "Scores 1 if short-term liquidity is improving — this year's current ratio exceeds last year's.",
    detail: "Current Ratio = Current Assets ÷ Current Liabilities. An improving ratio means the company has more short-term assets relative to short-term obligations.",
  },
  {
    id: "f7",
    term: "F7 — No Dilution (Leverage)",
    category: "piotroski",
    short: "Scores 1 if the company has not issued new shares in the past year — a signal of financial self-sufficiency.",
    detail: "Companies that frequently issue new shares to raise cash dilute existing shareholders. No new share issuance suggests the business generates enough internal cash to fund operations and growth.",
  },
  {
    id: "f8",
    term: "F8 — Gross Margin Improving (Efficiency)",
    category: "piotroski",
    short: "Scores 1 if pricing power or cost efficiency is increasing — this year's gross margin exceeds last year's.",
    formula: "Gross Margin = (Revenue − COGS) ÷ Revenue",
  },
  {
    id: "f9",
    term: "F9 — Asset Turnover Improving (Efficiency)",
    category: "piotroski",
    short: "Scores 1 if the company is generating more revenue per dollar of assets compared to last year.",
    formula: "Asset Turnover = Revenue ÷ Total Assets",
  },

  // ── Portfolio Terms ───────────────────────────────────────────────────────────
  {
    id: "cost-basis",
    term: "Cost Basis",
    category: "portfolio",
    short: "The original purchase price per share — used to calculate your gain or loss on a position.",
    detail:
      "If you buy 10 shares at $50, your cost basis is $50/share ($500 total). If you later buy 10 more at $60, your average cost basis across all 20 shares is $55/share. We track each purchase lot separately so you can see both the individual lot prices and the blended average cost.",
  },
  {
    id: "unrealized",
    term: "Unrealized Return / Gain",
    category: "portfolio",
    short: "The current paper gain or loss on positions you still hold — it becomes realized when you sell.",
    detail:
      "Unrealized return = (Current Price − Cost Basis) ÷ Cost Basis. It changes daily as the stock price moves. Unrealized gains are not taxable events — the gain only crystallizes (and becomes taxable) when you sell the position.",
    formula: "Unrealized Return % = (Current Price − Cost Basis) ÷ Cost Basis × 100",
  },
  {
    id: "realized",
    term: "Realized P&L / Realized Gains",
    category: "portfolio",
    short: "Actual gains or losses from positions you have already sold.",
    detail:
      "When you sell a holding, the difference between your sale price and cost basis is a realized gain (if positive) or realized loss (if negative). Unlike unrealized gains, realized gains are taxable. The Portfolio page tracks realized gains separately from unrealized so you can see both your paper performance and your locked-in results.",
  },
  {
    id: "holdings",
    term: "Holdings",
    category: "portfolio",
    short: "The positions currently in your portfolio — stocks you have purchased and not yet sold.",
  },
  {
    id: "lots",
    term: "Lots",
    category: "portfolio",
    short: "Individual purchase batches of the same ticker at different prices or dates.",
    detail:
      "Each time you buy shares of a stock, it creates a new lot. Lots matter for tax purposes because gains are calculated per lot. The Portfolio page shows each lot individually and also aggregates them into a single position summary with weighted average cost.",
  },
  {
    id: "allocation",
    term: "Allocation",
    category: "portfolio",
    short: "The percentage of your portfolio's total value held in each position, shown as a pie chart.",
  },

  // ── Growth & Momentum ────────────────────────────────────────────────────────
  {
    id: "relative-strength",
    term: "Relative Strength",
    category: "momentum",
    short: "A stock's return minus SPY's return over the same period — positive means the stock has outperformed the market.",
    detail:
      "We calculate relative strength for 3-month, 6-month, and 12-month windows. If a stock returned +20% and SPY returned +12% over 12 months, relative strength is +8%. Sustained positive relative strength means the market is actively rewarding this company versus the broad index — a key input for the Momentum Score.",
    formula: "Relative Strength = Stock Return − SPY Return",
  },
  {
    id: "return-periods",
    term: "Return 3m / 6m / 12m",
    category: "momentum",
    short: "The stock's total price return over the past 3, 6, or 12 months — approximately 63, 126, and 252 trading days respectively.",
  },
  {
    id: "eps-cagr",
    term: "EPS Growth (CAGR)",
    category: "momentum",
    short: "Compound Annual Growth Rate of Earnings Per Share over 1-year, 5-year, and 10-year periods.",
    detail:
      "Consistent EPS growth is one of the strongest signals of a compounding business. We track all three time horizons: the 1-year gives current trend; the 5-year shows medium-term trajectory; the 10-year reveals whether the business has been growing sustainably over a full economic cycle including recessions.",
  },
  {
    id: "revenue-cagr",
    term: "Revenue Growth (CAGR)",
    category: "momentum",
    short: "Compound Annual Growth Rate of total revenue — how fast the top line has been expanding.",
    detail:
      "Revenue growth is the engine that drives all downstream metrics. A company can temporarily boost EPS through buybacks or cost cuts; sustainable EPS growth generally requires revenue growth. We compare Revenue CAGR with EPS CAGR — EPS growing much faster than revenue can signal financial engineering rather than genuine operational improvement.",
  },
  {
    id: "bvps-cagr",
    term: "Book Value Per Share Growth (CAGR)",
    category: "momentum",
    short: "Compound Annual Growth Rate of BVPS — how quickly shareholders' net equity is compounding.",
    detail:
      "Growing BVPS means the company is retaining earnings and building intrinsic value for shareholders. Warren Buffett frequently cites BVPS growth as the best single measure of value created per share over time. Declining BVPS is a warning sign that the business is consuming more capital than it generates.",
  },
  {
    id: "roic-cagr",
    term: "ROIC Growth (CAGR)",
    category: "momentum",
    short: "Compound Annual Growth Rate of Return on Invested Capital — measuring whether capital efficiency is improving over time.",
  },
];

export function Glossary() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return TERMS.filter((t) => {
      const matchesCategory = activeCategory === "all" || t.category === activeCategory;
      const matchesQuery =
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        (t.detail ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Glossary</h2>
        </div>
        <p className="text-gray-500 text-sm">
          Definitions for every metric, acronym, and concept used in this app — from Graham Number to Piotroski F-Score to P&amp;L.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search terms…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeCategory === cat.id
                ? cat.color
                : "bg-gray-900 text-gray-500 border-gray-800 hover:border-gray-700 hover:text-gray-300"
            }`}
          >
            {cat.label}
            {cat.id !== "all" && (
              <span className="ml-1.5 opacity-60">
                {TERMS.filter((t) => t.category === cat.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-600">
        {filtered.length === TERMS.length
          ? `${TERMS.length} terms`
          : `${filtered.length} of ${TERMS.length} terms`}
      </p>

      {/* Terms */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
          No terms match "{query}".
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold text-sm leading-snug">{t.term}</h3>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${categoryStyle(t.category)}`}
                >
                  {categoryLabel(t.category)}
                </span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">{t.short}</p>

              {t.detail && (
                <p className="text-gray-500 text-xs leading-relaxed mt-2 border-t border-gray-800 pt-2">
                  {t.detail}
                </p>
              )}

              {t.formula && (
                <pre className="mt-2 text-[11px] text-emerald-400 bg-gray-800/60 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap leading-relaxed">
                  {t.formula}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 border-t border-gray-800 pt-4">
        All definitions are for educational purposes only and do not constitute investment advice.
        Metrics and calculations are based on publicly available financial data.
      </p>
    </div>
  );
}
