interface Props {
  label: string;
  value: string | number;
  sub?: string;
  positive?: boolean | null;
  className?: string;
}

export function StatCard({ label, value, sub, positive, className = "" }: Props) {
  const valueColor =
    positive === true
      ? "text-emerald-400"
      : positive === false
      ? "text-red-400"
      : "text-white";

  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${className}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
