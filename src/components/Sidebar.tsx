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
} from "lucide-react";
import { DisclaimerModal } from "./DisclaimerModal";
import { FeedbackModal } from "./FeedbackModal";

interface Props {
  onLogout: () => void;
  role?: "admin" | "subscriber";
}

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Stock Search" },
  { to: "/screener", icon: TrendingUp, label: "Screener" },
  { to: "/portfolio", icon: BriefcaseBusiness, label: "Portfolio" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ onLogout, role }: Props) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg tracking-tight">
          <span className="text-emerald-400">▲</span> Stock Terminal
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
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

        {/* Admin-only link */}
        {role === "admin" && (
          <>
            <div className="border-t border-gray-800 my-2" />
            <NavLink
              to="/admin/feedback"
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
        {/* Feedback button */}
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <MessageSquare size={16} />
          Send Feedback
        </button>

        {/* Disclaimer */}
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

        {/* Sign out */}
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
  );
}
