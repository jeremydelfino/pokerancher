import { Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { BrandMark } from "../components/TopBar.js";
import { useAuth } from "../state/AuthContext.js";

const PILLARS = [
  {
    speciesId: "snivy",
    title: "Le Refuge",
    body: "Installe tes compagnons dans les enclos. Baies, poissons, bois et minerai s'accumulent même quand tu n'es pas là.",
  },
  {
    speciesId: "keldeo",
    title: "L'Exploration",
    body: "Envoie ton équipe offensive dans des donjons générés à chaque run. Tu ramènes le butin, même en cas d'échec.",
  },
  {
    speciesId: "regirock",
    title: "Les Œufs",
    body: "Dépense tes éclats, ouvre des œufs. Les doublons fusionnent et font grimper les statistiques par paliers.",
  },
];

function DiscordGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.6 5.3A16.9 16.9 0 0 0 15.4 4l-.3.5c1.5.4 2.7 1 3.8 1.7a12.8 12.8 0 0 0-11.8 0C8.2 5.5 9.5 4.9 11 4.5L10.6 4a16.9 16.9 0 0 0-4.2 1.3C3.7 9.3 3 13.2 3.3 17a17 17 0 0 0 5.2 2.6l1-1.7c-.9-.3-1.7-.8-2.4-1.3l.6-.4a12.1 12.1 0 0 0 10.6 0l.6.4c-.7.5-1.5 1-2.4 1.3l1 1.7a17 17 0 0 0 5.2-2.6c.4-4.4-.6-8.3-2.9-11.7ZM9.3 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Zm5.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Z" />
    </svg>
  );
}

export function Landing() {
  const { user, loading } = useAuth();

  if (user && !loading) return <Navigate to="/refuge" replace />;

  return (
    <>
      <Ambience variant="full" />

      <section className="hero">
        <span className="hero-badge">
          <BrandMark size={18} />
          Fan-game · gratuit · sans pub
        </span>

        <h1 className="hero-title">
          Ton refuge, <em>ton rythme</em>
        </h1>

        <p className="hero-tagline">
          Un ranch qui travaille pendant ton absence, des donjons qui piquent, et des œufs qui font
          monter ton équipe de rêve.
        </p>

        <div className="hero-creatures" aria-hidden="true">
          <CreatureAvatar speciesId="bulbasaur" size={92} />
          <CreatureAvatar speciesId="lapras" size={116} />
          <CreatureAvatar speciesId="steelix" size={92} />
        </div>

        {loading ? (
          <span className="skeleton" style={{ width: 260, height: 54, borderRadius: 999 }} />
        ) : (
          <a className="btn btn-discord hero-cta" href={api.discordLoginUrl()}>
            <DiscordGlyph />
            Entrer avec Discord
          </a>
        )}

        <p className="hero-note">Aucun mot de passe à retenir — ton compte Discord suffit.</p>
      </section>

      <section className="pillars stagger">
        {PILLARS.map((pillar) => (
          <article className="pillar" key={pillar.title}>
            <div className="pillar-icon">
              <CreatureAvatar speciesId={pillar.speciesId} size={52} still />
            </div>
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </article>
        ))}
      </section>

      <footer className="site-footer">
        Projet de fan non officiel, sans lien avec Nintendo, Game Freak ou The Pokémon Company.
        Aucune publicité, aucun don, aucun achat.
      </footer>
    </>
  );
}
