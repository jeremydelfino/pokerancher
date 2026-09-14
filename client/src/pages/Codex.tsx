import { useEffect, useState } from "react";
import { api, type CodexResponse } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { RARITY_LABEL, Stars } from "../components/Stars.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { useToast } from "../components/Toast.js";

/**
 * The collection. Traits are shown for species the player has never owned on
 * purpose: knowing that Torterra carries Fertilisation *and* Bûcheron is the
 * reason to go hunting for it.
 */
export function Codex() {
  const [codex, setCodex] = useState<CodexResponse | null>(null);
  const [inventory, setInventory] = useState<Record<string, number> | undefined>();
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.codex(), api.refugeState()])
      .then(([entries, refuge]) => {
        setCodex(entries);
        setInventory(refuge.inventory);
      })
      .catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [toast]);

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">La Collection</h1>
            <p className="page-subtitle">
              {codex ? `${codex.ownedCount} espèces sur ${codex.total}` : "Ouverture du registre…"}
            </p>
          </div>
        </header>

        {!codex ? (
          <span className="skeleton" style={{ height: 320 }} />
        ) : (
          <div className="codex-grid stagger">
            {codex.entries.map((entry) => (
              <article
                key={entry.species.id}
                className={`codex-entry rarity-${entry.species.rarity} ${entry.owned ? "" : "codex-locked"}`}
              >
                <span className="codex-dex">Nº{String(entry.species.dex).padStart(3, "0")}</span>
                <CreatureAvatar speciesId={entry.species.id} size={64} still />
                <strong className="codex-name">{entry.owned ? entry.species.name : "???"}</strong>
                <span className="badge">{RARITY_LABEL[entry.species.rarity] ?? entry.species.rarity}</span>
                <TraitChips traits={entry.traits} muted={!entry.owned} />
                {entry.owned ? (
                  <span className="codex-meta">
                    <Stars count={entry.starTier.stars} />
                    <span>×{entry.quantity}</span>
                  </span>
                ) : (
                  <span className="codex-meta muted">Jamais obtenu</span>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
