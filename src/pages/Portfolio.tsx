import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  portfolioApi,
  PortfolioRow,
  PortfolioPerformanceResponse,
  HoldingPerformance,
} from "../api/client";
import { CompanyLogo } from "../components/CompanyLogo";
import { TickerTooltip } from "../components/TickerTooltip";
import { StatCard } from "../components/StatCard";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Trash2,
  ChevronRight,
  Upload,
  CheckCircle,
  XCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const COLORS = ["#34d399", "#818cf8", "#f472b6", "#fb923c", "#38bdf8", "#a78bfa"];

// ── Sell Modal ────────────────────────────────────────────────────────────────

function SellModal({
  portfolioId,
  holding,
  onClose,
}: {
  portfolioId: string;
  holding: HoldingPerformance;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [shares, setShares] = useState(
    holding.shares != null ? String(holding.shares) : ""
  );
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    const parsedShares = parseFloat(shares);
    if (!parsedShares || parsedShares <= 0) {
      setError("Enter a positive number of shares.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await portfolioApi.sellHolding(
        portfolioId,
        holding.id,
        parsedShares,
        price ? parseFloat(price) : undefined,
        date || undefined
      );
      qc.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setSaving(false);
    }
  }

  const estGain =
    shares && price
      ? (parseFloat(price) - holding.price_at_add) * parseFloat(shares)
      : null;
  const marketGain =
    shares
      ? (holding.current_price - holding.price_at_add) * parseFloat(shares)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-bold text-base mb-4">
          Sell {holding.ticker}
        </h3>

        <form onSubmit={handleSell} className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Shares to sell</label>
            <input
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              type="number"
              min="0.000001"
              step="any"
              placeholder={holding.shares != null ? String(holding.shares) : "e.g. 10"}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
            {holding.shares != null && (
              <p className="text-xs text-gray-600 mt-1">
                Currently holding {holding.shares} shares
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Sale price per share{" "}
              <span className="text-gray-600">(leave blank for today's market price)</span>
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="0"
              step="any"
              placeholder={`Market: $${holding.current_price.toFixed(2)}`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Sale date{" "}
              <span className="text-gray-600">(leave blank for today)</span>
            </label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
          </div>

          {/* Estimated P&L preview */}
          {(estGain !== null || marketGain !== null) && (
            <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs space-y-1">
              {marketGain !== null && !price && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. at market price</span>
                  <span className={marketGain >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {marketGain >= 0 ? "+" : ""}${marketGain.toFixed(2)}
                  </span>
                </div>
              )}
              {estGain !== null && price && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. realized gain</span>
                  <span className={estGain >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {estGain >= 0 ? "+" : ""}${estGain.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Cost basis</span>
                <span>${holding.price_at_add.toFixed(2)}/share</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg py-2 transition-colors"
            >
              {saving ? "Recording…" : "Record Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Portfolio Detail ──────────────────────────────────────────────────────────

function PortfolioDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const [addTicker, setAddTicker] = useState("");
  const [addShares, setAddShares] = useState("");
  const [addDate, setAddDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [sellHolding, setSellHolding] = useState<HoldingPerformance | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  // CSV import state
  const [importResults, setImportResults] = useState<
    { row: number; ticker: string; ok: boolean; msg: string }[]
  >([]);
  const [importing, setImporting] = useState(false);

  const q = useQuery<PortfolioPerformanceResponse, Error>({
    queryKey: ["portfolio", id],
    queryFn: () => portfolioApi.get(id),
    refetchInterval: 60_000,
  });

  const removeMut = useMutation({
    mutationFn: ({ hId }: { hId: string }) =>
      portfolioApi.removeHolding(id, hId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio", id] }),
  });

  async function addHolding(e: React.FormEvent) {
    e.preventDefault();
    const ticker = addTicker.trim().toUpperCase();
    if (!ticker) return;
    setAdding(true);
    try {
      await portfolioApi.addHolding(
        id,
        ticker,
        addShares ? parseFloat(addShares) : undefined,
        addDate || undefined
      );
      setAddTicker("");
      setAddShares("");
      setAddDate("");
      qc.invalidateQueries({ queryKey: ["portfolio", id] });
    } finally {
      setAdding(false);
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImporting(true);
    setImportResults([]);
    try {
      const response = await portfolioApi.importHoldings(id, file);
      setImportResults(
        response.rows.map((r) => ({
          row: r.row,
          ticker: r.ticker,
          ok: r.ok,
          msg: r.ok
            ? `Added at $${r.price_used?.toFixed(2) ?? "?"}`
            : (r.error ?? "Unknown error"),
        }))
      );
      qc.invalidateQueries({ queryKey: ["portfolio", id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setImportResults([{ row: 0, ticker: "", ok: false, msg }]);
    } finally {
      setImporting(false);
    }
  }

  if (q.isLoading)
    return <p className="text-gray-400 text-sm py-4">Loading portfolio…</p>;
  if (q.isError)
    return (
      <p className="text-red-400 text-sm py-4">{q.error.message}</p>
    );
  if (!q.data) return null;

  const { portfolio, holdings, total_return_pct, realized } = q.data;
  const hasRealized = realized.rows.length > 0;

  // Pie chart data by ticker weight
  const pieData = holdings
    .filter((h) => h.shares != null)
    .map((h) => ({
      name: h.ticker,
      value: h.shares! * h.price_at_add,
    }));

  // Simulated performance line (return % per holding, sorted by added_at)
  const lineData = [...holdings]
    .sort(
      (a, b) =>
        new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    )
    .map((h) => ({
      ticker: h.ticker,
      return: h.return_pct.toFixed(2),
    }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Holdings" value={holdings.length} />
        <StatCard
          label="Unrealized Return"
          value={
            total_return_pct != null
              ? `${total_return_pct >= 0 ? "+" : ""}${total_return_pct.toFixed(2)}%`
              : "—"
          }
          positive={total_return_pct != null ? total_return_pct >= 0 : null}
        />
        <StatCard
          label="Realized P&L"
          value={
            hasRealized
              ? `${realized.total_realized_gain >= 0 ? "+" : ""}$${Math.abs(realized.total_realized_gain).toFixed(2)}`
              : "—"
          }
          positive={hasRealized ? realized.total_realized_gain >= 0 : null}
        />
        <StatCard
          label="Visibility"
          value={portfolio.is_public ? "Public" : "Private"}
        />
      </div>

      {/* Charts */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h5 className="text-sm font-semibold text-gray-300 mb-3">
              Allocation
            </h5>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  formatter={(v: unknown) => [`$${Number(v).toFixed(0)}`, "Cost basis"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h5 className="text-sm font-semibold text-gray-300 mb-3">
              Return % per Holding
            </h5>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={lineData}
                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="ticker"
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
                  formatter={(v: unknown) => [`${v}%`, "Return"]}
                />
                <Line
                  type="monotone"
                  dataKey="return"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ fill: "#34d399" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h5 className="text-sm font-semibold text-gray-300">Open Positions</h5>
        </div>
        {holdings.length === 0 ? (
          <p className="text-gray-500 text-sm px-4 py-6 text-center">
            No holdings yet — add one below.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                <th className="text-left px-4 py-2">Ticker</th>
                <th className="text-right px-4 py-2">Cost</th>
                <th className="text-right px-4 py-2">Current</th>
                <th className="text-right px-4 py-2">Return</th>
                <th className="text-right px-4 py-2">Shares</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <TickerTooltip ticker={h.ticker}>
                      <span className="flex items-center gap-2">
                        <CompanyLogo ticker={h.ticker} size="sm" />
                        <span className="font-semibold text-white">{h.ticker}</span>
                      </span>
                    </TickerTooltip>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-300">
                    ${h.price_at_add.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-300">
                    ${h.current_price.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${h.return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {h.return_pct >= 0 ? "+" : ""}
                    {h.return_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {h.shares ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSellHolding(h)}
                        className="text-xs px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
                        title="Record sale"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => removeMut.mutate({ hId: h.id })}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove holding"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add holding form */}
        <form
          onSubmit={addHolding}
          className="px-4 py-3 border-t border-gray-800 space-y-2"
        >
          <div className="flex gap-2 flex-wrap">
            <input
              value={addTicker}
              onChange={(e) => setAddTicker(e.target.value)}
              placeholder="Ticker (e.g. AAPL)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-36"
            />
            <input
              value={addShares}
              onChange={(e) => setAddShares(e.target.value)}
              placeholder="Shares (optional)"
              type="number"
              min="0"
              step="any"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 w-36"
            />
            <input
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              type="date"
              max={new Date().toISOString().split("T")[0]}
              title="Backdate this purchase (optional)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Plus size={14} />
              {adding ? "Looking up…" : "Add"}
            </button>
          </div>
          {addDate && (
            <p className="text-xs text-gray-500">
              Price will be fetched from Yahoo Finance history for {addDate}.
            </p>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition-colors">
              <Upload size={13} />
              {importing ? "Importing…" : "Import CSV"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={handleCsvImport}
              />
            </label>
            <span className="text-xs text-gray-600">
              CSV or XLSX — columns: ticker, date (YYYY-MM-DD), shares, price (optional)
            </span>
          </div>
        </form>

        {/* CSV import results */}
        {importResults.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-800 space-y-1 max-h-40 overflow-y-auto">
            {importResults.map((r) => (
              <div
                key={`${r.row}-${r.ticker}`}
                className="flex items-center gap-2 text-xs"
              >
                {r.ok ? (
                  <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle size={13} className="text-red-400 flex-shrink-0" />
                )}
                <span className="font-medium text-white w-16">{r.ticker}</span>
                <span className={r.ok ? "text-gray-400" : "text-red-400"}>{r.msg}</span>
              </div>
            ))}
            {importing && (
              <p className="text-xs text-gray-500 animate-pulse">Processing…</p>
            )}
          </div>
        )}
      </div>

      {/* Closed Positions */}
      {hasRealized && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-gray-500" />
              <h5 className="text-sm font-semibold text-gray-300">Closed Positions</h5>
              <span className="text-xs text-gray-600">({realized.rows.length})</span>
              <span
                className={`text-xs font-semibold ml-1 ${
                  realized.total_realized_gain >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {realized.total_realized_gain >= 0 ? "+" : ""}$
                {Math.abs(realized.total_realized_gain).toFixed(2)} total
              </span>
            </div>
            {showClosed ? (
              <ChevronUp size={14} className="text-gray-500" />
            ) : (
              <ChevronDown size={14} className="text-gray-500" />
            )}
          </button>

          {showClosed && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-t border-b border-gray-800">
                  <th className="text-left px-4 py-2">Ticker</th>
                  <th className="text-right px-4 py-2">Shares</th>
                  <th className="text-right px-4 py-2">Cost</th>
                  <th className="text-right px-4 py-2">Sale</th>
                  <th className="text-right px-4 py-2">Gain / Loss</th>
                  <th className="text-right px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {realized.rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <CompanyLogo ticker={r.ticker} size="sm" />
                        <span className="font-semibold text-white">{r.ticker}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400">
                      {r.shares.toFixed(r.shares % 1 === 0 ? 0 : 4)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400">
                      ${r.cost_per_share.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300">
                      ${r.sale_price.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${
                        r.realized_gain >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {r.realized_gain >= 0 ? "+" : ""}${r.realized_gain.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                      {new Date(r.sold_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sell Modal */}
      {sellHolding && (
        <SellModal
          portfolioId={id}
          holding={sellHolding}
          onClose={() => setSellHolding(null)}
        />
      )}
    </div>
  );
}

// ── Portfolio Page ────────────────────────────────────────────────────────────

export function Portfolio() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const listQ = useQuery<PortfolioRow[], Error>({
    queryKey: ["portfolios"],
    queryFn: () => portfolioApi.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => portfolioApi.delete(id),
    onSuccess: (_, id) => {
      if (selectedId === id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  async function createPortfolio(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await portfolioApi.create(newName.trim(), isPublic);
      await qc.invalidateQueries({ queryKey: ["portfolios"] });
      setSelectedId(p.id);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Portfolio</h2>
        <p className="text-gray-500 text-sm">
          Track holdings and monitor performance over time.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left: portfolio list */}
        <div className="w-56 flex-shrink-0 space-y-2">
          {listQ.data?.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                selectedId === p.id
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-gray-900 border border-gray-800 hover:border-gray-700"
              }`}
              onClick={() => setSelectedId(p.id)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.is_public ? "Public" : "Private"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ChevronRight
                  size={14}
                  className={`text-gray-600 ${selectedId === p.id ? "text-emerald-400" : ""}`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Create form */}
          <form
            onSubmit={createPortfolio}
            className="bg-gray-900 border border-gray-800 border-dashed rounded-lg p-3 space-y-2"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New portfolio name…"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-emerald-500"
              />
              Make public
            </label>
            <button
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded px-2 py-1.5 transition-colors disabled:opacity-50"
            >
              <Plus size={12} />
              Create
            </button>
          </form>
        </div>

        {/* Right: selected portfolio detail */}
        <div className="flex-1 min-w-0">
          {selectedId ? (
            <PortfolioDetail id={selectedId} />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm border border-gray-800 rounded-xl border-dashed">
              Select or create a portfolio
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
