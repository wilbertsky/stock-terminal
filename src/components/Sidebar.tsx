import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  BriefcaseBusiness,
  TrendingUp,
  Users,
  LogOut,
  Settings,
  MessageSquare,
  ShieldCheck,
  X,
} from "lucide-react";
import { DisclaimerModal } from "./DisclaimerModal";
import { FeedbackModal } from "./FeedbackModal";

interface Props {
  onLogout: () => void;
  role?: "admin" | "subscriber";
  open: boolean;
  onClose: () => void;
}

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Stock Search" },
  { to: "/screener", icon: TrendingUp, label: "Screener" },
  { to: "/portfolio", icon: BriefcaseBusiness, label: "Portfolio" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ onLogout, role, open, onClose }: Props) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-screen z-50
          w-64 md:w-56
          bg-gray-900 border-r border-gray-800
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" />
            Stock Terminal
          </h1>
          <button
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {role === "admin" && (
            <>
              <div className="border-t border-gray-800 my-2" />
              <NavLink
                to="/admin/feedback"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-500/10 text-purple-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                  }`
                }
              >
                <ShieldCheck size={16} />
                Feedback (Admin)
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <button
            onClick={() => { setShowFeedback(true); onClose(); }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <MessageSquare size={16} />
            Send Feedback
          </button>

          <div className="px-3 py-1">
            <p className="text-[10px] text-gray-600 leading-relaxed">
              For educational use only.{" "}
              <button
                onClick={() => setShowDisclaimer(true)}
                className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
              >
                Full disclaimer
              </button>
            </p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        {showDisclaimer && (
          <DisclaimerModal onClose={() => setShowDisclaimer(false)} />
        )}
        {showFeedback && (
          <FeedbackModal onClose={() => setShowFeedback(false)} />
        )}
      </aside>
    </>
  );
}
