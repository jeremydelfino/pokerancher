import { useEffect } from "react";
import { useAuth } from "../state/AuthContext.js";
import { THEMES, THEME_HINT, THEME_LABEL, useTheme } from "../state/ThemeContext.js";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Paramètres">
        <div className="modal-head">
          <h2 className="modal-title">Paramètres</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="label modal-section">Ambiance</p>
        <div className="theme-grid">
          {THEMES.map((option) => (
            <button
              key={option}
              className={`theme-card ${theme === option ? "theme-card-active" : ""}`}
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
            >
              <span className={`theme-preview theme-preview-${option}`} aria-hidden="true" />
              <span className="theme-name">{THEME_LABEL[option]}</span>
              <span className="theme-hint">{THEME_HINT[option]}</span>
            </button>
          ))}
        </div>

        <div className="modal-foot">
          <span className="modal-user">Connecté comme {user?.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
