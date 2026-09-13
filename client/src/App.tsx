import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Gacha } from "./pages/Gacha.js";
import { Landing } from "./pages/Landing.js";
import { Refuge } from "./pages/Refuge.js";
import { useAuth } from "./state/AuthContext.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Chargement...</p>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      {user && (
        <nav className="nav">
          <Link to="/refuge">Refuge</Link>
          <Link to="/gacha">Gacha</Link>
          <span className="nav-user">{user.username}</span>
          <button onClick={logout}>Déconnexion</button>
        </nav>
      )}

      <main>
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
        </Routes>
      </main>
    </div>
  );
}
