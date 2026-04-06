import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Building2 } from "lucide-react";
import { stock, CompanyProfile } from "../api/client";

interface Props {
  ticker: string;
  children: React.ReactNode;
}

export function TickerTooltip({ ticker, children }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, above: false });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileQ = useQuery<CompanyProfile, Error>({
    queryKey: ["profile", ticker],
    queryFn: () => stock.profile(ticker),
    enabled: show,
    retry: false,
    staleTime: Infinity,
  });

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setShow(false), 120);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  function handleMouseEnter() {
    cancelHide();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const TOOLTIP_W = 288;
      const TOOLTIP_H = 180; // rough estimate
      const x = Math.min(rect.left, window.innerWidth - TOOLTIP_W - 12);
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < TOOLTIP_H + 12;
      setPos({ x, y: above ? rect.top - 8 : rect.bottom + 8, above });
    }
    setShow(true);
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleHide}
        className="cursor-default"
      >
        {children}
      </span>

      {show && (
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.above ? undefined : pos.y,
            bottom: pos.above ? window.innerHeight - pos.y : undefined,
            width: 288,
            zIndex: 9999,
          }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 space-y-2.5"
        >
          {profileQ.isLoading && (
            <p className="text-xs text-gray-500 animate-pulse">Loading…</p>
          )}

          {profileQ.data && (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-white">{ticker}</span>
                {(profileQ.data.sector || profileQ.data.industry) && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 text-right leading-tight">
                    <Building2 size={10} className="flex-shrink-0" />
                    {[profileQ.data.sector, profileQ.data.industry]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>

              {profileQ.data.description && (
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                  {profileQ.data.description}
                </p>
              )}

              {profileQ.data.website && (
                <a
                  href={profileQ.data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink size={11} />
                  {profileQ.data.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </>
          )}

          {profileQ.isError && (
            <p className="text-xs text-gray-600">No company info available.</p>
          )}
        </div>
      )}
    </>
  );
}
