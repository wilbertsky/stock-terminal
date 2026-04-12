import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Search } from "./pages/Search";
import { Portfolio } from "./pages/Portfolio";
import { Screener } from "./pages/Screener";
import { Settings } from "./pages/Settings";
import { AdminFeedback } from "./pages/AdminFeedback";
import { CommunityPortfolios } from "./pages/CommunityPortfolios";
import { auth } from "./api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AppShell({ onLogout }: { onLogout: () => void }) {
  const meQ = useQuery({ queryKey: ["me"], queryFn: auth.me });
  const role = meQ.data?.role;

  return (
    <div className="flex bg-gray-950 min-h-screen text-white">
      <Sidebar onLogout={onLogout} role={role} />
      <main className="ml-56 flex-1 p-8 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/community" element={<CommunityPortfolios />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/admin/feedback"
            element={
              role === "admin" ? <AdminFeedback /> : <Navigate to="/" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));

  useEffect(() => {
    const storageHandler = () => setAuthed(!!localStorage.getItem("token"));
    window.addEventListener("storage", storageHandler);
    return () => window.removeEventListener("storage", storageHandler);
  }, []);

  useEffect(() => {
    const expiredHandler = () => logout();
    window.addEventListener("auth:expired", expiredHandler);
    return () => window.removeEventListener("auth:expired", expiredHandler);
  }, []);

  // Check for app updates on startup (no-op outside of Tauri).
  // dialog: true in tauri.conf.json means Tauri shows a native prompt and
  // handles download + relaunch automatically when an update is found.
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    import("@tauri-apps/plugin-updater")
      .then(({ check }) => check())
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    queryClient.clear();
    setAuthed(false);
  }

  if (!authed) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={() => setAuthed(true)} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell onLogout={logout} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
