import { NavLink } from "react-router-dom";
import { useAuth } from "../state/AuthContext.js";
import { ResourcePill } from "./ResourcePill.js";

const RESOURCE_ORDER = ["berry", "fish", "wood", "ore", "egg_shard"];

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="brand-egg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="100%" stopColor="#ffe0b0" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="var(--meadow-near)" />
      <path d="M20 7c6 5 9.5 11 9.5 15.6A9.5 9.5 0 0 1 10.5 22.6C10.5 18 14 12 20 7Z" fill="url(#brand-egg)" />
      <path d="M13 24h14" stroke="var(--amber-deep)" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
      <path d="M20 7c0-3 2-5 5-5.5" stroke="var(--meadow-deep)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function TopBar({ inventory }: { inventory?: Record<string, number> }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const resources = RESOURCE_ORDER.filter((r) => inventory && r in inventory);

  return (
    <header className="topbar glass">
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
