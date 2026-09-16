import { useCallback, useEffect, useMemo, useState } from "react";
import { RARITY_ORDER, TRAIT_DEFINITIONS } from "@pokerancher/shared";
import { api, type CodexEntry, type CodexResponse } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { Frame } from "../components/Frame.js";
import { RARITY_LABEL, Stars } from "../components/Stars.js";
import { TypeBadges } from "../components/TypeBadge.js";
import { PokemonSheet } from "../components/PokemonSheet.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { useToast } from "../components/Toast.js";

type SortKey = "dex" | "rarity" | "traits" | "owned";

const SORT_LABEL: Record<SortKey, string> = {
  dex: "Pokédex",
  rarity: "Rareté",
  traits: "Nombre de traits",
  owned: "Possédés d'abord",
};

const rarityRank = (rarity: string) => RARITY_ORDER.indexOf(rarity as never);

/** A labelled owned/total pair with a pixel gauge — the rail's whole vocabulary. */
function Gauge({
  label,
  owned,
  total,
  tone,
}: {
  label: string;
  owned: number;
  total: number;
  tone?: string;
}) {
  const ratio = total === 0 ? 0 : owned / total;
  return (
    <div className="gauge" title={`${owned} sur ${total}`}>
      <span className="gauge-head">
        <span className="gauge-label">{label}</span>
        <span className="gauge-value">
          {owned}
          <span className="gauge-total">/{total}</span>
        </span>
      </span>
      <span className="gauge-track">
        <span
          className="gauge-fill"
          style={{ transform: `scaleX(${ratio})`, background: tone ?? "var(--c-grass)" }}
        />
      </span>
    </div>
  );
}

/**
 * The collection.
 *
 * Traits are shown for species the player has never owned on purpose: knowing
 * that Torterra carries Fertilisation *and* Bûcheron is the reason to go hunting
 * for it. The trait filter turns that into a tool — "who else could light my
 * Carapace threshold" is one click, not a memory exercise.
 */
export function Codex() {
  const [codex, setCodex] = useState<CodexResponse | null>(null);
  const [inventory, setInventory] = useState<Record<string, number> | undefined>();
  const [trait, setTrait] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("dex");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const [entries, refuge] = await Promise.all([api.codex(), api.refugeState()]);
    setCodex(entries);
    setInventory(refuge.inventory);
  }, []);

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [load, toast]);

  const shown = useMemo(() => {
    if (!codex) return [] as CodexEntry[];
    const list = codex.entries.filter(
      (entry) => (!trait || entry.traits.includes(trait)) && (!ownedOnly || entry.owned)
    );

    const compare: Record<SortKey, (a: CodexEntry, b: CodexEntry) => number> = {
      dex: (a, b) => a.species.dex - b.species.dex,
      rarity: (a, b) =>
        rarityRank(b.species.rarity) - rarityRank(a.species.rarity) || a.species.dex - b.species.dex,
      traits: (a, b) => b.traits.length - a.traits.length || a.species.dex - b.species.dex,
      owned: (a, b) => Number(b.owned) - Number(a.owned) || a.species.dex - b.species.dex,
    };

    return [...list].sort(compare[sort]);
  }, [codex, trait, sort, ownedOnly]);

  const traitRows = useMemo(() => {
    if (!codex) return [];
    // Sorted by what is still missing: the traits you cannot yet field are the
    // ones worth hunting, so they float to the top of the rail.
    return [...codex.byTrait].sort(
      (a, b) => b.total - b.owned - (a.total - a.owned) || a.traitId.localeCompare(b.traitId)
    );
  }, [codex]);

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">La Collection</h1>
            <p className="page-subtitle">
              {codex
                ? `${codex.ownedCount} espèces sur ${codex.total} · ${codex.duplicates} exemplaires`
                : "Ouverture du registre…"}
            </p>
          </div>
        </header>

        {!codex ? (
          <span className="skeleton" style={{ height: 380 }} />
        ) : (
          <div className="stage stage-no-right">
            {/* Left rail: how complete the collection is, and by what measure. */}
            <aside className="stage-rail stage-left">
              <Frame greenery="vine">
                <p className="rail-title">Complétion</p>
                <Gauge label="Espèces" owned={codex.ownedCount} total={codex.total} />
                <div className="gauge-stack">
                  {codex.byRarity.map((row) => (
                    <Gauge
                      key={row.rarity}
                      label={RARITY_LABEL[row.rarity] ?? row.rarity}
                      owned={row.owned}
                      total={row.total}
                      tone={`var(--rarity-${row.rarity})`}
                    />
                  ))}
                </div>
                <p className="stat-line" style={{ marginTop: "var(--s4)" }}>
                  <span>Exemplaires</span>
                  <strong>{codex.duplicates}</strong>
                </p>
                <p className="stat-line">
                  <span>Avec au moins 1 ⭐</span>
                  <strong>{codex.starred}</strong>
                </p>
                <p className="stat-line">
                  <span>Chromatiques ✦</span>
                  <strong>{codex.shinies}</strong>
                </p>
              </Frame>

              <Frame tone="sunken" greenery="none">
                <p className="rail-title">Traits</p>
                <p className="choice-prompt">Filtre la collection sur un trait.</p>
                <div className="trait-filter">
                  <button
                    className={`trait-filter-row ${trait === null ? "trait-filter-active" : ""}`}
                    onClick={() => setTrait(null)}
                  >
                    <span className="trait-filter-name">Tous</span>
                    <span className="trait-filter-count">
                      {codex.ownedCount}/{codex.total}
                    </span>
                  </button>
                  {traitRows.map((row) => {
                    const definition = TRAIT_DEFINITIONS[row.traitId];
                    return (
                      <button
                        key={row.traitId}
                        className={`trait-filter-row ${trait === row.traitId ? "trait-filter-active" : ""} ${
                          definition?.exclusive ? "trait-filter-signature" : ""
                        }`}
                        onClick={() => setTrait(trait === row.traitId ? null : row.traitId)}
                        title={definition?.description}
                      >
                        <span aria-hidden="true">{definition?.icon}</span>
                        <span className="trait-filter-name">{definition?.name ?? row.traitId}</span>
                        <span className="trait-filter-count">
                          {row.owned}/{row.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Frame>
            </aside>

            {/* Centre: the registry itself. */}
            <div className="stage-main">
              <Frame greenery="corner">
                <div className="codex-toolbar">
                  <span className="rail-title" style={{ margin: 0 }}>
                    {trait
                      ? `${TRAIT_DEFINITIONS[trait]?.name ?? trait} — ${shown.length} espèce(s)`
                      : `${shown.length} espèce(s)`}
                  </span>
                  <label className="codex-sort">
                    Trier
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                      {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                        <option key={key} value={key}>
                          {SORT_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={`btn btn-sm ${ownedOnly ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setOwnedOnly((v) => !v)}
                    aria-pressed={ownedOnly}
                  >
                    Possédés
                  </button>
                </div>

                {shown.length === 0 ? (
                  <div className="empty">
                    <CreatureAvatar speciesId="magikarp" size={96} />
                    <p>Aucune espèce ne correspond à ce filtre.</p>
                  </div>
                ) : (
                  <div className="codex-grid stagger">
                    {shown.map((entry) => (
                      <button
                        key={entry.species.id}
                        className={`codex-entry rarity-${entry.species.rarity} ${
                          entry.owned ? "codex-open" : "codex-locked"
                        }`}
                        disabled={!entry.owned}
                        onClick={() => entry.unitId && setOpenUnit(entry.unitId)}
                        title={entry.owned ? `Ouvrir la fiche de ${entry.species.name}` : undefined}
                      >
                        <span className="codex-dex">
                          Nº{String(entry.species.dex).padStart(3, "0")}
                        </span>
                        {entry.owned && <span className="codex-level">N.{entry.level}</span>}
                        {entry.shinyUnlocked && (
                          <span className="codex-shiny" title="Forme chromatique débloquée">
                            ✦
                          </span>
                        )}
                        <CreatureAvatar
                          speciesId={entry.species.id}
                          size={96}
                          still
                          shiny={entry.shiny}
                        />
                        <strong className="codex-name">
                          {entry.owned ? entry.species.name : "???"}
                        </strong>
                        <TypeBadges types={entry.types} size="sm" />
                        <span className="badge">
                          {RARITY_LABEL[entry.species.rarity] ?? entry.species.rarity}
                        </span>
                        <TraitChips traits={entry.traits} muted={!entry.owned} />
                        {entry.owned ? (
                          <span className="codex-meta">
                            <Stars count={entry.starTier.stars} />
                            <span>×{entry.quantity}</span>
                          </span>
                        ) : (
                          <span className="codex-meta muted">Jamais obtenu</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Frame>
            </div>
          </div>
        )}
      </div>

      {openUnit && (
        <PokemonSheet
          unitId={openUnit}
          onClose={() => setOpenUnit(null)}
          onChanged={() => {
            load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
          }}
        />
      )}
    </>
  );
}
