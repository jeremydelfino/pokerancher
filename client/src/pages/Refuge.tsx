import { useCallback, useEffect, useState } from "react";
import { api, type OwnedPokemon, type RefugeState } from "../api/client.js";

export function Refuge() {
  const [state, setState] = useState<RefugeState | null>(null);
  const [pokemon, setPokemon] = useState<OwnedPokemon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [refuge, owned] = await Promise.all([api.refugeState(), api.pokemon()]);
    setState(refuge);
    setPokemon(owned);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(String(err)));
    const interval = setInterval(() => load().catch(() => undefined), 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleAssign(slotType: string, pokemonUnitId: string) {
    setBusySlot(slotType);
    setError(null);
    try {
      const next = await api.assignPokemon(slotType, pokemonUnitId || null);
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusySlot(null);
    }
  }

  async function handleClaim(slotType: string) {
    setBusySlot(slotType);
    setError(null);
    try {
      await api.claimSlot(slotType);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusySlot(null);
    }
  }

  async function handleClaimAll() {
    setError(null);
    try {
      await api.claimAll();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!state) return <p className="loading">Chargement du refuge...</p>;

  return (
    <div className="refuge">
      <header className="refuge-header">
        <h1>Le Refuge</h1>
        <button onClick={handleClaimAll}>Tout récolter</button>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="inventory">
        {Object.entries(state.inventory).map(([resource, qty]) => (
          <span key={resource} className="inventory-item">
            {resource}: {qty}
          </span>
        ))}
      </section>

      <section className="slots">
        {state.slots.map((slot) => {
          const eligible = pokemon.filter((p) => p.species.trait?.slot === slot.type);
          return (
            <div key={slot.type} className="slot-card">
              <h3>{slot.label}</h3>
              <p className="slot-resource">Ressource : {slot.resource}</p>

              {slot.assigned ? (
                <div className="slot-assigned">
                  <p>{slot.assigned.speciesId}</p>
                  <p>En attente : {slot.pendingAmount}</p>
                  <button disabled={busySlot === slot.type} onClick={() => handleClaim(slot.type)}>
                    Récolter
                  </button>
                  <button disabled={busySlot === slot.type} onClick={() => handleAssign(slot.type, "")}>
                    Retirer
                  </button>
                </div>
              ) : (
                <p>Emplacement vide</p>
              )}

              {eligible.length > 0 && (
                <select
                  disabled={busySlot === slot.type}
                  value=""
                  onChange={(e) => e.target.value && handleAssign(slot.type, e.target.value)}
                >
                  <option value="">Assigner un Pokémon...</option>
                  {eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.species.name} ({p.starTier.stars}★, x{p.quantity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
