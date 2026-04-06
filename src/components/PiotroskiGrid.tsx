import { PiotroskiResponse } from "../api/client";
import { Check, X } from "lucide-react";

interface Props {
  data: PiotroskiResponse;
}

const signals: { key: keyof PiotroskiResponse; label: string; group: string }[] = [
  { key: "f1_roa_positive", label: "ROA Positive", group: "Profitability" },
  { key: "f2_ocf_positive", label: "OCF Positive", group: "Profitability" },
  { key: "f3_roa_increasing", label: "ROA Increasing", group: "Profitability" },
  { key: "f4_accrual_quality", label: "Low Accruals", group: "Profitability" },
  { key: "f5_leverage_decreasing", label: "Leverage Decreasing", group: "Leverage" },
  { key: "f6_current_ratio_improving", label: "Current Ratio Up", group: "Leverage" },
  { key: "f7_no_dilution", label: "No Dilution", group: "Leverage" },
  { key: "f8_gross_margin_improving", label: "Gross Margin Up", group: "Efficiency" },
  { key: "f9_asset_turnover_improving", label: "Asset Turnover Up", group: "Efficiency" },
];

export function PiotroskiGrid({ data }: Props) {
  return (
    <div className="space-y-3">
      {["Profitability", "Leverage", "Efficiency"].map((group) => (
        <div key={group}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            {group}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {signals
              .filter((s) => s.group === group)
              .map(({ key, label }) => {
                const pass = data[key] as boolean;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      pass
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {pass ? <Check size={14} /> : <X size={14} />}
                    {label}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
