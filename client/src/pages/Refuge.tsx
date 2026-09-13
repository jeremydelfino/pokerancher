import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type OwnedPokemon, type RefugeState } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { AssignSheet } from "../components/AssignSheet.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { ResourcePill } from "../components/ResourcePill.js";
import { SlotCard } from "../components/SlotCard.js";
import { resourceLabel } from "../components/ResourceIcon.js";
import { TopBar } from "../components/TopBar.js";
import { useToast } from "../components/Toast.js";

export function Refuge() {
  const [state, setState] = useState<RefugeState | null>(null);
  const [pokemon, setPokemon] = useState<OwnedPokemon[]>([]);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
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
    setTimeout(() => setGains((current) => {
      const next = { ...current };
      delete next[slotType];
      return next;
    }), 1500);
  }, []);

  const runSlotAction = useCallback(
    async (slotType: string, action: () => Promise<void>) => {
      setBusySlot(slotType);
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
    runSlotAction(slotType, async () => {
      const result = await api.claimSlot(slotType);
      if (result.amount > 0 && result.resource) {
        showGain(slotType, result.amount);
        toast(`+${result.amount.toLocaleString("fr-FR")} ${resourceLabel(result.resource)}`, "success");
      } else {
        toast("Rien à récolter pour le moment", "info");
      }
      await load();
    });

  const handleAssign = (slotType: string, pokemonUnitId: string | null) =>
    runSlotAction(slotType, async () => {
      const next = await api.assignPokemon(slotType, pokemonUnitId);
      setState(next);
      setFetchedAt(Date.now());
      setPickerSlot(null);
    });

  const handleClaimAll = async () => {
    try {
      const { claimed } = await api.claimAll();
      if (claimed.length === 0) {
        toast("Les enclos sont déjà vides", "info");
      } else {
        for (const entry of claimed) showGain(entry.slotType, entry.amount);
        const total = claimed.reduce((sum, entry) => sum + entry.amount, 0);
        toast(`${total.toLocaleString("fr-FR")} ressources récoltées`, "success");
      }
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const pickerSlotState = state?.slots.find((s) => s.type === pickerSlot) ?? null;
  const candidates = pickerSlot
    ? pokemon.filter((p) => p.species.trait?.slot === pickerSlot)
    : [];

  const occupied = state?.slots.filter((s) => s.assigned).length ?? 0;

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={state?.inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">Le Refuge</h1>
            <p className="page-subtitle">
              {state ? `${occupied} enclos sur ${state.slots.length} en activité · ${pokemon.length} compagnons` : "Réveil du ranch…"}
            </p>
          </div>
          {state && (
            <div className="res-bar page-res">
              {Object.entries(state.inventory).map(([resource, amount]) => (
                <ResourcePill key={resource} resource={resource} amount={amount} showLabel />
              ))}
            </div>
          )}
        </header>

        {!state ? (
          <div className="slot-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="skeleton" style={{ height: 330, borderRadius: "var(--r-lg)" }} />
            ))}
          </div>
        ) : (
          <>
            <div className="refuge-summary">
              <CreatureAvatar speciesId="sunkern" size={58} />
              <div className="refuge-summary-text">
                <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
                  Production hors-ligne plafonnée à 12 h — passe récolter avant que les réservoirs débordent.
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleClaimAll}>
                Tout récolter
              </button>
            </div>

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
                  onRelease={() => handleAssign(slot.type, null)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {pickerSlotState && (
        <AssignSheet
          slotLabel={pickerSlotState.label}
          candidates={candidates}
          currentUnitId={pickerSlotState.assigned?.pokemonUnitId ?? null}
          onPick={(unitId) => handleAssign(pickerSlotState.type, unitId)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </>
  );
}
