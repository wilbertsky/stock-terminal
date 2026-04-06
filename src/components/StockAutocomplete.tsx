import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { stock, StockSearchResult } from "../api/client";
import { CompanyLogo } from "./CompanyLogo";

const EXCHANGE_COLORS: Record<string, string> = {
  NASDAQ: "bg-blue-500/20 text-blue-400",
  NYSE: "bg-purple-500/20 text-purple-400",
  AMEX: "bg-orange-500/20 text-orange-400",
  OTC: "bg-gray-500/20 text-gray-400",
  TSX: "bg-red-500/20 text-red-400",
  LSE: "bg-yellow-500/20 text-yellow-400",
};

function exchangeStyle(short: string | null) {
  if (!short) return "bg-gray-500/20 text-gray-400";
  return EXCHANGE_COLORS[short.toUpperCase()] ?? "bg-gray-500/20 text-gray-400";
}

interface Props {
  onSelect: (ticker: string) => void;
  loading?: boolean;
}

export function StockAutocomplete({ onSelect, loading = false }: Props) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await stock.search(q.trim());
        setResults(res.results);
        setOpen(res.results.length > 0);
        setHighlighted(0);
      } catch (err) {
        setResults([]);
        setOpen(false);
        setSearchError(err instanceof Error ? err.message : String(err));
      } finally {
        setSearching(false);
      }
    }, 280);
  }, []);

  useEffect(() => {
    doSearch(input);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(result: StockSearchResult) {
    setInput(result.symbol);
    setOpen(false);
    onSelect(result.symbol);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && input.trim()) {
        onSelect(input.trim().toUpperCase());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex-1 max-w-md" ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        {(searching || loading) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search ticker or company name…"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-9 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Search error */}
      {searchError && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-red-950 border border-red-700 rounded-xl px-3 py-2 text-red-300 text-xs">
          Search error: {searchError}
        </div>
      )}

      {/* Dropdown */}
      {!searchError && open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => select(r)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === highlighted ? "bg-gray-800" : "hover:bg-gray-800/60"
              } ${i > 0 ? "border-t border-gray-800" : ""}`}
            >
              <CompanyLogo ticker={r.symbol} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">
                    {r.symbol}
                  </span>
                  {r.exchange_short && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${exchangeStyle(r.exchange_short)}`}
                    >
                      {r.exchange_short}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs truncate">{r.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
