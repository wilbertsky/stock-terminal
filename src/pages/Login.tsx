import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { auth } from "../api/client";

interface Props {
  onLogin: () => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

export function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await auth.register(email, password, inviteCode.trim(), displayName.trim() || undefined);
      }
      if (mode === "login" || mode === "register") {
        const res = await auth.login(email, password);
        localStorage.setItem("token", res.token);
        onLogin();
        return;
      }
      if (mode === "forgot") {
        await auth.forgotPassword(email);
        setInfo("If that email is registered you'll receive a reset code shortly. Enter it below.");
        switchMode("reset");
        return;
      }
      if (mode === "reset") {
        if (newPassword !== confirmPassword) {
          setError("Passwords don't match.");
          return;
        }
        if (newPassword.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        await auth.resetPassword(resetToken.trim(), newPassword);
        setInfo("Password updated — you can now sign in.");
        switchMode("login");
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login:    "Sign in",
    register: "Create account",
    forgot:   "Reset password",
    reset:    "Set new password",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <TrendingUp size={28} className="text-emerald-400" />
            Stock Terminal
          </h1>
          <p className="text-gray-500 text-sm mt-2">Quantitative stock analysis</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-6">{titles[mode]}</h2>

          <form onSubmit={submit} className="space-y-4">
            {/* Register fields */}
            {mode === "register" && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Invite code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Display name <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="How you appear in Community"
                  />
                </div>
              </>
            )}

            {/* Email — shown on login, register, forgot */}
            {mode !== "reset" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="you@example.com"
                />
              </div>
            )}

            {/* Password — login and register */}
            {(mode === "login" || mode === "register") && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Reset flow fields */}
            {mode === "reset" && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Reset code</label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="Paste the code from your email"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            {info && (
              <p className="text-emerald-400 text-sm bg-emerald-500/10 rounded-lg px-3 py-2">
                {info}
              </p>
            )}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg py-2 text-sm transition-colors"
            >
              {loading ? "Please wait…" : {
                login:    "Sign in",
                register: "Create account",
                forgot:   "Send reset code",
                reset:    "Set new password",
              }[mode]}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-4 space-y-2 text-center text-sm text-gray-500">
            {(mode === "login" || mode === "register") && (
              <p>
                {mode === "login" ? "No account? " : "Already have one? "}
                <button
                  onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  className="text-emerald-400 hover:underline"
                >
                  {mode === "login" ? "Register" : "Sign in"}
                </button>
              </p>
            )}
            {(mode === "forgot" || mode === "reset") && (
              <p>
                <button
                  onClick={() => switchMode("login")}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
