import { useQuery } from "@tanstack/react-query";
import { marketApi, MarketQuote } from "../api/client";
import { TrendingDown, TrendingUp } from "lucide-react";

const INDEX_SYMBOLS = new Set(["SPY", "QQQ", "DIA"]);

function ChangeLabel({ changePct }: { changePct: number }) {
  const up = changePct >= 0;
  return (
    <span className={`font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "+" : ""}{changePct.toFixed(2)}%
    </span>
  );
}

function IndexCard({ q }: { q: MarketQuote }) {
  const up = q.change_pct >= 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{q.symbol}</span>
        {up
          ? <TrendingUp size={13} className="text-emerald-400" />
          : <TrendingDown size={13} className="text-red-400" />
        }
      </div>
      <p className="text-[11px] text-gray-500">{q.name}</p>
      <p className="text-base font-semibold text-white mt-0.5">${q.price.toFixed(2)}</p>
      <p className="text-xs"><ChangeLabel changePct={q.change_pct} /></p>
    </div>
  );
}

function SectorCard({ q }: { q: MarketQuote }) {
  const up = q.change_pct >= 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-2 flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-white">{q.symbol}</span>
        {up
          ? <TrendingUp size={10} className="text-emerald-400 shrink-0" />
          : <TrendingDown size={10} className="text-red-400 shrink-0" />
        }
      </div>
      <p className="text-[9px] text-gray-600 truncate leading-tight">{q.name}</p>
      <p className="text-[11px] font-medium text-gray-300">${q.price.toFixed(2)}</p>
      <p className="text-[10px]"><ChangeLabel changePct={q.change_pct} /></p>
    </div>
  );
}

function SkeletonCard({ large }: { large?: boolean }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 animate-pulse ${
        large ? "rounded-xl h-[88px]" : "rounded-lg h-[72px]"
      }`}
    />
  );
}

export function MarketSnapshotStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-snapshot"],
    queryFn: marketApi.snapshot,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Market Snapshot
        </h3>
        <span className="text-[10px] text-gray-700">~10 min delay</span>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} large />)}
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(11, minmax(0, 1fr))" }}
          >
            {Array.from({ length: 11 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : isError || !data?.quotes.length ? null : (
        <>
          {/* Indices */}
          <div>
            <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-1.5">
              Indices
            </p>
            <div className="grid grid-cols-3 gap-3">
              {data.quotes
                .filter((q) => INDEX_SYMBOLS.has(q.symbol))
                .map((q) => <IndexCard key={q.symbol} q={q} />)}
            </div>
          </div>

          {/* Sectors */}
          <div>
            <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-1.5">
              Sectors
            </p>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(11, minmax(0, 1fr))" }}
            >
              {data.quotes
                .filter((q) => !INDEX_SYMBOLS.has(q.symbol))
                .map((q) => <SectorCard key={q.symbol} q={q} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
