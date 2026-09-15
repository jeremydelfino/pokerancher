import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type OwnedPokemon, type RefugeState } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { AssignSheet } from "../components/AssignSheet.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { Frame } from "../components/Frame.js";
import { ResourcePill } from "../components/ResourcePill.js";
import { SlotCard } from "../components/SlotCard.js";
import { SynergyPanel } from "../components/SynergyPanel.js";
import { resourceLabel } from "../components/ResourceIcon.js";
import { TopBar } from "../components/TopBar.js";
import { UpgradeDialog } from "../components/UpgradeDialog.js";
import { useToast } from "../components/Toast.js";

const fr = (n: number) => n.toLocaleString("fr-FR");

export function Refuge() {
  const [state, setState] = useState<RefugeState | null>(null);
  const [pokemon, setPokemon] = useState<OwnedPokemon[]>([]);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [upgradeSlot, setUpgradeSlot] = useState<string | null>(null);
  const [gains, setGains] = useState<Record<string, number>>({});
  const toast = useToast();

  const load = useCallback(async () => {
    const [refuge, owned] = await Promise.all([api.refugeState(), api.pokemon()]);
    setState(refuge);
    setPokemon(owned);
    setFetchedAt(Date.now());
  }, []);

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [load, toast]);

  const starsByUnit = useMemo(() => {
    const map = new Map(pokemon.map((p) => [p.id, p.starTier.stars]));
    return (unitId: string) => map.get(unitId) ?? 0;
  }, [pokemon]);

  const showGain = useCallback((slotType: string, amount: number) => {
    setGains((current) => ({ ...current, [slotType]: amount }));
    setTimeout(
      () =>
        setGains((current) => {
          const next = { ...current };
          delete next[slotType];
          return next;
        }),
      1500
    );
  }, []);

  const run = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setBusySlot(key);
      try {
        await action();
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusySlot(null);
      }
    },
    [toast]
  );

  const handleClaim = (slotType: string) =>
    run(slotType, async () => {
      const result = await api.claimSlot(slotType);
      if (result.amount > 0 && result.resource) {
        showGain(slotType, result.amount);
        toast(`+${fr(result.amount)} ${resourceLabel(result.resource)}`, "success");
      } else {
        toast("Rien à récolter pour le moment", "info");
      }
      await load();
    });

  const handleAssign = (slotType: string, pokemonUnitId: string) =>
    run(slotType, async () => {
      setState(await api.assignPokemon(slotType, pokemonUnitId));
      setFetchedAt(Date.now());
      setPickerSlot(null);
      setPokemon(await api.pokemon());
    });

  const handleRelease = (slotType: string, pokemonUnitId: string) =>
    run(slotType, async () => {
      setState(await api.releasePokemon(pokemonUnitId));
      setFetchedAt(Date.now());
      setPokemon(await api.pokemon());
    });

  const handleUpgrade = (slotType: string, label: string) =>
    run(slotType, async () => {
      const result = await api.upgradeSlot(slotType);
      toast(`${label} — niveau ${result.level}, ${result.capacity} places !`, "success");
      setState(result.refuge);
      setFetchedAt(Date.now());
    });

  const handleClaimAll = async () => {
    try {
      const { claimed } = await api.claimAll();
      if (claimed.length === 0) {
        toast("Les enclos sont déjà vides", "info");
      } else {
        for (const entry of claimed) showGain(entry.slotType, entry.amount);
        toast(`${fr(claimed.reduce((sum, e) => sum + e.amount, 0))} ressources récoltées`, "success");
      }
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const pickerSlotState = state?.slots.find((s) => s.type === pickerSlot) ?? null;
  const upgradeSlotState = state?.slots.find((s) => s.type === upgradeSlot) ?? null;

  // Candidates for the open pen: the right job, not already in it, and free.
  const candidates = pickerSlot
    ? pokemon.filter(
        (p) =>
          p.species.trait?.slot === pickerSlot &&
          !pickerSlotState?.workers.some((w) => w.pokemonUnitId === p.id) &&
          p.busy?.kind !== "expedition"
      )
    : [];

  const staffed = state?.slots.filter((s) => s.workers.length > 0).length ?? 0;
  const seats = state?.slots.reduce((sum, s) => sum + s.capacity, 0) ?? 0;
  const filled = state?.slots.reduce((sum, s) => sum + s.workers.length, 0) ?? 0;
  const pending = state?.slots.reduce((sum, s) => sum + s.pendingAmount, 0) ?? 0;

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={state?.inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">Le Refuge</h1>
            <p className="page-subtitle">
              {state
                ? `${staffed} enclos sur ${state.slots.length} en activité · ${filled}/${seats} places occupées`
                : "Réveil du ranch…"}
            </p>
          </div>
        </header>

        {!state ? (
          <div className="slot-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="skeleton" style={{ height: 420 }} />
            ))}
          </div>
        ) : (
          <div className="stage">
            {/* Left rail: what the composition is doing. */}
            <aside className="stage-rail stage-left">
              <Frame tone="dark" greenery="vine">
                <SynergyPanel synergies={state.synergies} />
              </Frame>

              <Frame tone="dark" greenery="none">
                <p className="rail-title">Compagnons</p>
                <p className="stat-line">
                  <span>Au travail</span>
                  <strong>{filled}</strong>
                </p>
                <p className="stat-line">
                  <span>En expédition</span>
                  <strong>{state.units.filter((u) => u.busy?.kind === "expedition").length}</strong>
                </p>
                <p className="stat-line">
                  <span>Disponibles</span>
                  <strong>{state.units.filter((u) => !u.busy).length}</strong>
                </p>
              </Frame>
            </aside>

            {/* Centre: the pens themselves. */}
            <div className="stage-main">
              <div className="slot-grid stagger">
                {state.slots.map((slot) => (
                  <SlotCard
                    key={slot.type}
                    slot={slot}
                    fetchedAt={fetchedAt}
                    starsFor={starsByUnit}
                    busy={busySlot === slot.type}
                    gain={gains[slot.type] ?? null}
                    onClaim={() => handleClaim(slot.type)}
                    onOpenPicker={() => setPickerSlot(slot.type)}
                    onRelease={(unitId) => handleRelease(slot.type, unitId)}
                    onUpgrade={() => setUpgradeSlot(slot.type)}
                  />
                ))}
              </div>
            </div>

            {/* Right rail: the harvest. */}
            <aside className="stage-rail stage-right">
              <Frame greenery="corner">
                <p className="rail-title">Récolte</p>
                <p className="refuge-summary-text">
                  Production hors-ligne plafonnée à 12&nbsp;h — passe récolter avant que les
                  réservoirs débordent.
                </p>
                <p className="stat-line">
                  <span>En attente</span>
                  <strong>{fr(pending)}</strong>
                </p>
                <button
                  className="btn btn-primary btn-block"
                  disabled={busySlot !== null}
                  onClick={handleClaimAll}
                >
                  Tout récolter
                </button>
              </Frame>

              <Frame greenery="none">
                <p className="rail-title">Réserves</p>
                <div className="res-bar res-bar-column">
                  {Object.entries(state.inventory).map(([resource, amount]) => (
                    <ResourcePill key={resource} resource={resource} amount={amount} showLabel />
                  ))}
                </div>
              </Frame>

              <Frame greenery="none" tone="sunken">
                <p className="rail-title">Agrandir</p>
                <p className="choice-prompt">
                  Le bouton <strong>UP</strong> sur un enclos ouvre son échelle d'améliorations.
                  Chaque niveau ajoute une place — donc un porteur de trait de plus.
                </p>
                <p className="stat-line">
                  <span>Pièces</span>
                  <strong>{fr(state.inventory.coin ?? 0)}</strong>
                </p>
              </Frame>
            </aside>
          </div>
        )}
      </div>

      {upgradeSlotState && (
        <UpgradeDialog
          slot={upgradeSlotState}
          coins={state?.inventory.coin ?? 0}
          busy={busySlot !== null}
          onBuy={() => handleUpgrade(upgradeSlotState.type, upgradeSlotState.label)}
          onClose={() => setUpgradeSlot(null)}
        />
      )}

      {pickerSlotState && (
        <AssignSheet
          slotLabel={`${pickerSlotState.label} — ${pickerSlotState.workers.length}/${pickerSlotState.capacity}`}
          candidates={candidates}
          currentUnitIds={pickerSlotState.workers.map((w) => w.pokemonUnitId)}
          resource={pickerSlotState.resource}
          onPick={(unitId) => handleAssign(pickerSlotState.type, unitId)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </>
  );
}
