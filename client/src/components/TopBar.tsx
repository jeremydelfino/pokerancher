import { NavLink } from "react-router-dom";
import { useAuth } from "../state/AuthContext.js";
import { PixelIcon, type Palette } from "./pixel.js";
import { ResourcePill } from "./ResourcePill.js";

const RESOURCE_ORDER = ["berry", "fish", "wood", "ore", "egg_shard"];

const MARK: Palette = {
  G: "#3c6b4a",
  g: "#8fbf6a",
  i: "#fbf3dd",
  y: "#f2b03d",
};

/** A speckled egg with a sprouting leaf — the ranch in ten pixels wide. */
const BRAND = [
  "...GG.....",
  "..GgG.....",
  "...GG.....",
  "...iiii...",
  "..iiiiii..",
  ".iiiiiiii.",
  ".iiyiiiyi.",
  "iiiiiiiiii",
  "iiyiiiiiyi",
  ".iiiiiiii.",
  "..iiiiii..",
  "...iiii...",
];

export function BrandMark({ size = 30 }: { size?: number }) {
  return <PixelIcon art={BRAND} palette={MARK} size={size} className="brand-mark" />;
}

export function TopBar({ inventory }: { inventory?: Record<string, number> }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const resources = RESOURCE_ORDER.filter((r) => inventory && r in inventory);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/refuge" className="brand">
          <BrandMark />
          <span>PokéRancher</span>
        </NavLink>

        <nav className="tabs" aria-label="Navigation principale">
          <NavLink to="/refuge" className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}>
            Refuge
          </NavLink>
          <NavLink to="/gacha" className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}>
            Œufs
          </NavLink>
        </nav>

        <div className="topbar-right">
          {resources.length > 0 && (
            <div className="res-bar topbar-res">
              {resources.map((resource) => (
                <ResourcePill key={resource} resource={resource} amount={inventory![resource]} />
              ))}
            </div>
          )}

          {user.avatarUrl ? (
            <img className="avatar" src={user.avatarUrl} alt="" />
          ) : (
            <span className="avatar avatar-initial" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="username topbar-name">{user.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Quitter
          </button>
        </div>
      </div>
    </header>
  );
}
