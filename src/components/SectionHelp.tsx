import { useState, useEffect, useRef } from "react";
import { HelpCircle, X } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function SectionHelp({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-600 hover:text-gray-300 transition-colors"
        aria-label={`Learn about ${title}`}
      >
        <HelpCircle size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-50 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h5 className="text-white font-semibold text-sm">{title}</h5>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="px-4 py-3 text-sm text-gray-400 space-y-2 leading-relaxed max-h-72 overflow-y-auto">
            {children}
          </div>
          <p className="px-4 py-2 border-t border-gray-700 text-xs text-gray-600 italic">
            For educational purposes only — not investment advice.
          </p>
        </div>
      )}
    </div>
  );
}
