import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Ambience } from "./components/Ambience.js";
import { CreatureAvatar } from "./components/CreatureAvatar.js";
import { Codex } from "./pages/Codex.js";
import { Explore } from "./pages/Explore.js";
import { Gacha } from "./pages/Gacha.js";
import { Landing } from "./pages/Landing.js";
import { Refuge } from "./pages/Refuge.js";
import { useAuth } from "./state/AuthContext.js";

function BootScreen() {
  return (
    <>
      <Ambience variant="soft" />
      <div className="empty" style={{ minHeight: "70vh" }}>
        <CreatureAvatar speciesId="sunkern" size={96} />
        <p>On ouvre le portail du ranch…</p>
      </div>
    </>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/refuge"
          element={
            <RequireAuth>
              <Refuge />
            </RequireAuth>
          }
        />
        <Route
          path="/gacha"
          element={
            <RequireAuth>
              <Gacha />
            </RequireAuth>
          }
        />
        <Route
          path="/explore"
          element={
            <RequireAuth>
              <Explore />
            </RequireAuth>
          }
        />
        <Route
          path="/codex"
          element={
            <RequireAuth>
              <Codex />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Scanlines and vignette over everything, including the sprites. */}
      <div className="crt" aria-hidden="true" />
    </div>
  );
}
