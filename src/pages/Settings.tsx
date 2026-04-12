import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "../api/client";
import { CheckCircle } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";

export function Settings() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: auth.me });

  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date">("idle");

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  // Sync input with fetched value on first load
  useEffect(() => {
    if (meQ.data) {
      setNameInput(meQ.data.display_name ?? "");
    }
  }, [meQ.data?.display_name]);

  const nameMut = useMutation({
    mutationFn: (name: string | null) => auth.updateProfile(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    },
  });

  const pwMut = useMutation({
    mutationFn: ({ cur, nw }: { cur: string; nw: string }) =>
      auth.changePassword(cur, nw),
    onSuccess: () => {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwError(null);
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: (e: Error) => setPwError(e.message),
  });

  async function checkForUpdates() {
    if (!("__TAURI_INTERNALS__" in window)) return;
    setUpdateStatus("checking");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      // If an update was found, dialog: true in tauri.conf.json handles the rest.
      // If null, there's nothing newer.
      setUpdateStatus(update ? "idle" : "up-to-date");
      if (!update) setTimeout(() => setUpdateStatus("idle"), 3000);
    } catch {
      setUpdateStatus("idle");
    }
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    pwMut.mutate({ cur: currentPw, nw: newPw });
  }

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    nameMut.mutate(trimmed || null);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Settings</h2>
        <p className="text-gray-500 text-sm">Manage your account.</p>
      </div>

      {/* Display name */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">Display Name</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown in Community instead of your email. Leave blank to stay anonymous.
          </p>
        </div>
        <form onSubmit={saveName} className="flex gap-2">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={50}
            placeholder="e.g. Warren B."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={nameMut.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            {nameSaved ? "Saved!" : nameMut.isPending ? "Saving…" : "Save"}
          </button>
          {nameInput && (
            <button
              type="button"
              onClick={() => { setNameInput(""); nameMut.mutate(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
        {nameMut.isError && (
          <p className="text-red-400 text-xs">{(nameMut.error as Error).message}</p>
        )}
      </div>

      {/* Change password */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">Change Password</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Minimum 8 characters.
          </p>
        </div>
        <form onSubmit={changePassword} className="space-y-2">
          {[
            { label: "Current password", value: currentPw, set: setCurrentPw },
            { label: "New password",     value: newPw,     set: setNewPw     },
            { label: "Confirm new",      value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <input
              key={label}
              type="password"
              placeholder={label}
              value={value}
              onChange={(e) => set(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          ))}
          {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
          {pwSaved && (
            <p className="text-emerald-400 text-xs flex items-center gap-1">
              <CheckCircle size={12} /> Password updated.
            </p>
          )}
          <button
            type="submit"
            disabled={pwMut.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            {pwMut.isPending ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Account</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Email</span>
          <span className="text-white">{meQ.data?.email ?? "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">User ID</span>
          <span className="text-gray-400 text-xs font-mono truncate max-w-xs">
            {meQ.data?.user_id ?? "—"}
          </span>
        </div>
      </div>

      {/* App updates — only shown inside Tauri */}
      {appVersion !== null && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">App Updates</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Current version</span>
            <span className="text-xs text-gray-400 font-mono">v{appVersion}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={checkForUpdates}
              disabled={updateStatus === "checking"}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {updateStatus === "checking" ? "Checking…" : "Check for updates"}
            </button>
            {updateStatus === "up-to-date" && (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle size={12} /> You're up to date.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Data sources */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Data Sources</h3>
        <p className="text-xs text-gray-500">
          Financial data is sourced from SEC EDGAR and Yahoo Finance.
          These are free public sources — no API key required.
        </p>
        <div className="space-y-2 pt-1">
          {[
            { name: "SEC EDGAR", detail: "Fundamentals (10-K filings)", status: "Active" },
            { name: "Yahoo Finance", detail: "Prices & search", status: "Active" },
          ].map(({ name, detail, status }) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-300">{name}</span>
                <span className="text-gray-600 text-xs ml-2">{detail}</span>
              </div>
              <span className="text-emerald-400 text-xs">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
