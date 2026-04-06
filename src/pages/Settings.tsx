import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "../api/client";

export function Settings() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: auth.me });

  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

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
