import { useState } from "react";

interface Props {
  ticker: string;
  size?: "sm" | "md";
}

export function CompanyLogo({ ticker, size = "md" }: Props) {
  const [src, setSrc] = useState(
    `https://assets.parqet.com/logos/symbol/${ticker}?format=svg`
  );
  const [failed, setFailed] = useState(false);

  const dim = size === "sm" ? "w-8 h-8" : "w-12 h-12";

  if (failed) {
    return (
      <div
        className={`${dim} rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300 flex-shrink-0`}
        style={{ fontSize: size === "sm" ? 11 : 13 }}
      >
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={ticker}
      className={`${dim} rounded-full object-contain bg-white p-0.5 flex-shrink-0`}
      onError={() => {
        if (src.includes("parqet")) {
          // First failure: try FMP
          setSrc(`https://financialmodelingprep.com/image-stock/${ticker}.png`);
        } else {
          // Second failure: show initials
          setFailed(true);
        }
      }}
    />
  );
}
