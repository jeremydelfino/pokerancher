import { Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.js";

export function Landing() {
  const { user, loading } = useAuth();

  if (loading) return <p className="loading">Chargement...</p>;
  if (user) return <Navigate to="/refuge" replace />;

  return (
    <div className="landing">
      <h1>PokéRancher</h1>
      <p>Un refuge Pokémon idle, un roguelite d'exploration, et un gacha à mérites. Gratuit, sans pub.</p>
      <a className="discord-login" href={api.discordLoginUrl()}>
        Se connecter avec Discord
      </a>
    </div>
  );
}
