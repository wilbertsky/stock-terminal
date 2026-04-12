const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface MeResponse {
  user_id: string;
  email: string;
  role: "admin" | "subscriber";
  has_fmp_key: boolean;
  display_name: string | null;
}

export interface AuthResponse {
  token: string;
}

export const auth = {
  register: (email: string, password: string, invite_code: string, display_name?: string) =>
    request<MeResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, invite_code, display_name: display_name || null }),
    }),

  updateProfile: (display_name: string | null) =>
    request<MeResponse>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ display_name }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<MeResponse>("/api/auth/me"),

  upsertFmpKey: (fmp_key: string) =>
    request<void>("/api/auth/fmp-key", {
      method: "PUT",
      body: JSON.stringify({ fmp_key }),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<void>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ current_password, new_password }),
    }),

  forgotPassword: (email: string) =>
    request<void>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<void>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface InviteCode {
  code: string;
  email: string;
  created_at: string;
  used_at: string | null;
}

export const adminApi = {
  createInvite: (email: string) =>
    request<InviteCode>("/api/admin/invite-codes", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  listInvites: () => request<InviteCode[]>("/api/admin/invite-codes"),
};

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface MetricCagr {
  cagr_1yr: number | null;
  cagr_5yr: number | null;
  cagr_10yr: number | null;
}

export interface FundamentalsYear {
  fiscal_year: string;
  revenue: number | null;
  eps: number | null;
  book_value_per_share: number | null;
  free_cash_flow_per_share: number | null;
  roic: number | null;
}

export interface SummaryResponse {
  ticker: string;
  current_price: number | null;
  fundamentals: { ticker: string; years: FundamentalsYear[] };
  growth_rates: {
    ticker: string;
    revenue: MetricCagr;
    eps: MetricCagr;
    book_value_per_share: MetricCagr;
    free_cash_flow_per_share: MetricCagr;
    roic: MetricCagr;
  };
  intrinsic_value: {
    ticker: string;
    growth_rate_used: number;
    pe_ratio_used: number;
    future_eps: number;
    future_price: number;
    estimated_intrinsic_value: number;
    margin_of_safety_price: number;
  } | null;
  graham_number: {
    ticker: string;
    eps: number;
    book_value_per_share: number;
    graham_number: number;
  } | null;
  peg: {
    ticker: string;
    pe_ratio: number;
    earnings_growth_rate_pct: number;
    peg_ratio: number;
  } | null;
  momentum: {
    ticker: string;
    return_3m: number | null;
    return_6m: number | null;
    return_12m: number | null;
    spy_return_3m: number | null;
    spy_return_6m: number | null;
    spy_return_12m: number | null;
    relative_strength_3m: number | null;
    relative_strength_6m: number | null;
    relative_strength_12m: number | null;
    momentum_score: number;
    interpretation: string;
  };
}

export interface PiotroskiResponse {
  ticker: string;
  score: number;
  f1_roa_positive: boolean;
  f2_ocf_positive: boolean;
  f3_roa_increasing: boolean;
  f4_accrual_quality: boolean;
  f5_leverage_decreasing: boolean;
  f6_current_ratio_improving: boolean;
  f7_no_dilution: boolean;
  f8_gross_margin_improving: boolean;
  f9_asset_turnover_improving: boolean;
  interpretation: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  exchange_short: string | null;
}

export interface ScreenerEntry {
  ticker: string;
  /** Score A (0–100) — meaning defined by score_labels[0] */
  score_a: number;
  /** Score B (0–100) — meaning defined by score_labels[1] */
  score_b: number;
  /** Score C (0–100) — meaning defined by score_labels[2] */
  score_c: number;
  /** Score D (0–100) — meaning defined by score_labels[3] */
  score_d: number;
  composite_score: number;
  score_tier: string;
}

export interface SectorScreenerResponse {
  sector: string;
  /** Name of the scoring model used (e.g. "Standard", "Financials", "Real Estate") */
  scoring_model: string;
  /** Human-readable labels for score_a, score_b, score_c, score_d */
  score_labels: string[];
  /** Percentage weight strings for each score slot */
  score_weights: string[];
  stocks_analyzed: number;
  results: ScreenerEntry[];
  disclaimer: string;
}

export const screenerApi = {
  getSector: (sector: string) =>
    request<SectorScreenerResponse>(`/api/screener/${sector}`),
};

export interface CompanyProfile {
  ticker: string;
  description: string;
  sector: string | null;
  industry: string | null;
  website: string | null;
  employees: number | null;
}

export interface NewsItem {
  title: string;
  url: string;
  published: string | null;
  source: string | null;
  summary: string | null;
}

export interface CompanyNewsResponse {
  ticker: string;
  items: NewsItem[];
}

export interface QualityScoreResponse {
  ticker: string;
  gross_margin: number | null;
  gross_margin_trend: string | null;
  return_on_equity: number | null;
  debt_to_equity: number | null;
  quality_score: number;
  interpretation: string;
}

export interface DividendMetricsResponse {
  ticker: string;
  dividend_yield_pct: number | null;
  payout_ratio: number | null;
  dividend_per_share: number | null;
  dividend_growth_rate_1yr: number | null;
  is_sustainable: boolean | null;
  interpretation: string;
}

export const stock = {
  summary: (ticker: string) =>
    request<SummaryResponse>(`/api/stock/${ticker}/summary`),
  piotroski: (ticker: string) =>
    request<PiotroskiResponse>(`/api/stock/${ticker}/piotroski`),
  quality: (ticker: string) =>
    request<QualityScoreResponse>(`/api/stock/${ticker}/quality`),
  dividends: (ticker: string) =>
    request<DividendMetricsResponse>(`/api/stock/${ticker}/dividends`),
  search: (q: string) =>
    request<{ results: StockSearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  profile: (ticker: string) =>
    request<CompanyProfile>(`/api/stock/${ticker}/profile`),
  news: (ticker: string) =>
    request<CompanyNewsResponse>(`/api/stock/${ticker}/news`),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface PortfolioRow {
  id: string;
  name: string;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface HoldingPerformance {
  id: string;
  ticker: string;
  price_at_add: number;
  shares: number | null;
  added_at: string;
  current_price: number;
  return_pct: number;
}

export interface RealizedGainRow {
  id: string;
  ticker: string;
  shares: number;
  cost_per_share: number;
  sale_price: number;
  realized_gain: number;
  sold_at: string;
}

export interface RealizedGainsSummary {
  rows: RealizedGainRow[];
  total_realized_gain: number;
}

export interface PortfolioPerformanceResponse {
  portfolio: PortfolioRow;
  holdings: HoldingPerformance[];
  total_return_pct: number | null;
  realized: RealizedGainsSummary;
}

export interface ImportRowResult {
  row: number;
  ticker: string;
  ok: boolean;
  price_used: number | null;
  error: string | null;
}

export interface ImportHoldingsResponse {
  imported: number;
  failed: number;
  rows: ImportRowResult[];
}

export const portfolioApi = {
  list: () => request<PortfolioRow[]>("/api/portfolio"),

  create: (name: string, is_public: boolean) =>
    request<PortfolioRow>("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({ name, is_public }),
    }),

  get: (id: string) =>
    request<PortfolioPerformanceResponse>(`/api/portfolio/${id}`),

  delete: (id: string) =>
    request<void>(`/api/portfolio/${id}`, { method: "DELETE" }),

  addHolding: (id: string, ticker: string, shares?: number, date?: string) =>
    request<HoldingPerformance>(`/api/portfolio/${id}/holdings`, {
      method: "POST",
      body: JSON.stringify({ ticker, shares, date: date || undefined }),
    }),

  importHoldings: (id: string, file: File): Promise<ImportHoldingsResponse> => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/api/portfolio/${id}/holdings/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
      }
      return res.json();
    });
  },

  removeHolding: (portfolioId: string, holdingId: string) =>
    request<void>(`/api/portfolio/${portfolioId}/holdings/${holdingId}`, {
      method: "DELETE",
    }),

  sellHolding: (
    portfolioId: string,
    holdingId: string,
    shares: number,
    price?: number,
    date?: string
  ) =>
    request<RealizedGainRow>(
      `/api/portfolio/${portfolioId}/holdings/${holdingId}/sell`,
      {
        method: "POST",
        body: JSON.stringify({ shares, price: price ?? null, date: date ?? null }),
      }
    ),

  getPublic: (shareToken: string) =>
    request<PortfolioPerformanceResponse>(
      `/api/portfolio/public/${shareToken}`
    ),
};

// ── Community ─────────────────────────────────────────────────────────────────

export interface PublicPortfolioSummary {
  id: string;
  name: string;
  owner: string;
  holdings: HoldingPerformance[];
  total_return_pct: number | null;
  total_unrealized_gain: number;
  realized: RealizedGainsSummary;
  combined_gain: number;
}

export const communityApi = {
  list: () => request<PublicPortfolioSummary[]>("/api/community"),
};

// ── Feedback ──────────────────────────────────────────────────────────────────

export interface FeedbackRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
}

export const feedbackApi = {
  submit: (message: string) =>
    request<void>("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  list: (unreadOnly?: boolean) =>
    request<FeedbackRow[]>(
      `/api/feedback${unreadOnly ? "?unread_only=true" : ""}`
    ),

  markRead: (id: string) =>
    request<void>(`/api/feedback/${id}/read`, { method: "PATCH" }),
};
