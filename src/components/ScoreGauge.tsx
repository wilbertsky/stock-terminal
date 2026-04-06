interface Props {
  score: number;
  max?: number;
  label: string;
  size?: number;
}

export function ScoreGauge({ score, max = 100, label, size = 120 }: Props) {
  const pct = Math.min(score / max, 1);
  const r = 40;
  const circ = 2 * Math.PI * r;
  // Half-circle gauge: use 75% of the circumference
  const arcLen = circ * 0.75;
  const dash = pct * arcLen;
  const gap = arcLen - dash;

  const color =
    pct >= 0.7
      ? "#34d399"  // emerald
      : pct >= 0.4
      ? "#fbbf24"  // amber
      : "#f87171"; // red

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.65} viewBox="0 0 100 65">
        {/* Track */}
        <circle
          cx="50"
          cy="55"
          r={r}
          fill="none"
          stroke="#374151"
          strokeWidth="10"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx="50"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          {max === 9 ? `${score}/9` : Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
