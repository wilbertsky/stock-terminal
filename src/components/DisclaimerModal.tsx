import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function DisclaimerModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold text-base">Disclaimer</h3>
            <p className="text-gray-500 text-xs mt-0.5">Educational use only</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <p>
            <span className="text-white font-medium">Not investment advice.</span>{" "}
            All analysis, scores, valuations, and data provided by this application
            are for <span className="text-white">educational and informational purposes only</span>.
            Nothing in this application constitutes investment advice, a solicitation,
            or a recommendation to buy, sell, or hold any security or financial instrument.
          </p>

          <p>
            <span className="text-white font-medium">No guarantee of accuracy.</span>{" "}
            Financial data is sourced from third-party providers (SEC EDGAR, Yahoo Finance,
            Financial Modeling Prep) and may be incomplete, delayed, or inaccurate.
            Calculated metrics — including Piotroski F-Score, DCF intrinsic value, Graham
            number, momentum scores, and composite screener rankings — are derived from
            this data and are subject to the same limitations.
          </p>

          <p>
            <span className="text-white font-medium">Past performance.</span>{" "}
            Historical financial data and past stock performance are not indicative
            of future results. Quantitative scores and rankings do not predict or
            guarantee future returns.
          </p>

          <p>
            <span className="text-white font-medium">Consult a professional.</span>{" "}
            Before making any investment decision, you should conduct your own
            independent research and consult a licensed financial advisor, broker,
            or investment professional who can take into account your specific
            financial situation, goals, and risk tolerance.
          </p>

          <p>
            <span className="text-white font-medium">No liability.</span>{" "}
            The authors and operators of this application accept no liability for
            any financial loss, damage, or consequence arising from the use of or
            reliance on information provided herein.
          </p>

          <p className="text-gray-600 text-xs border-t border-gray-800 pt-4">
            This tool is a personal project built for learning and research. It is
            not affiliated with, endorsed by, or registered with any financial
            regulatory authority including the SEC, FINRA, or FCA.
          </p>
        </div>
      </div>
    </div>
  );
}
