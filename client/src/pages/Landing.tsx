import { Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { PixelIcon } from "../components/pixel.js";
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

const DISCORD_GLYPH = [
  "..iiiiii..",
  ".iiiiiiii.",
  "ii.iiii.ii",
  "iiiiiiiiii",
  "iiiiiiiiii",
  "ii.iiii.ii",
  ".iiiiiiii.",
  ".i......i.",
];

function DiscordGlyph() {
  return <PixelIcon art={DISCORD_GLYPH} palette={{ i: "#ffffff" }} size={20} />;
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
          <CreatureAvatar speciesId="bulbasaur" size={88} />
          <CreatureAvatar speciesId="lapras" size={112} />
          <CreatureAvatar speciesId="steelix" size={88} />
        </div>

        {loading ? (
          <span className="skeleton" style={{ width: 260, height: 52 }} />
        ) : (
          <a className="btn btn-discord btn-lg hero-cta" href={api.discordLoginUrl()}>
            <DiscordGlyph />
            Entrer avec Discord
          </a>
        )}

        <p className="hero-note">Aucun mot de passe — ton compte Discord suffit</p>
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
