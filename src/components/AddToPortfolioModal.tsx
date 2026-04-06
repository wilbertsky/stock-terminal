import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { portfolioApi, PortfolioRow } from "../api/client";

interface Props {
  ticker: string;
  onClose: () => void;
}

export function AddToPortfolioModal({ ticker, onClose }: Props) {
  const qc = useQueryClient();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create new portfolio state
  const [newName, setNewName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const listQ = useQuery<PortfolioRow[], Error>({
    queryKey: ["portfolios"],
    queryFn: () => portfolioApi.list(),
  });

  async function addToPortfolio(portfolioId: string) {
    setLoadingId(portfolioId);
    setError(null);
    try {
      await portfolioApi.addHolding(portfolioId, ticker);
      qc.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
      setAddedId(portfolioId);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add holding");
    } finally {
      setLoadingId(null);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const p = await portfolioApi.create(newName.trim(), isPublic);
      await qc.invalidateQueries({ queryKey: ["portfolios"] });
      await addToPortfolio(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create portfolio");
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold text-base">
              Add to Portfolio
            </h3>
            <p className="text-emerald-400 text-sm font-mono mt-0.5">{ticker}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Existing portfolios */}
        <div className="space-y-2 mb-5">
          {listQ.isLoading && (
            <p className="text-gray-500 text-sm text-center py-4">Loading portfolios…</p>
          )}
          {listQ.data?.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-2">No portfolios yet — create one below.</p>
          )}
          {listQ.data?.map((p) => {
            const isAdded = addedId === p.id;
            const isLoading = loadingId === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.is_public ? "Public" : "Private"}</p>
                </div>
                <button
                  onClick={() => addToPortfolio(p.id)}
                  disabled={!!loadingId || !!addedId}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    isAdded
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-500 hover:bg-emerald-400 text-gray-950"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isAdded ? (
                    <Check size={12} />
                  ) : (
                    <Plus size={12} />
                  )}
                  {isAdded ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-4" />

        {/* Create new portfolio */}
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
          New Portfolio
        </p>
        <form onSubmit={createAndAdd} className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Portfolio name…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
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
              disabled={!newName.trim() || creating || !!addedId}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Create & Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
