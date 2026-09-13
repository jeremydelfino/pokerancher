import { useCallback, useEffect, useState } from "react";
import { api, type GachaResult } from "../api/client.js";

export function Gacha() {
  const [eggCost, setEggCost] = useState<{ resource: string; amount: number } | null>(null);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const loadInfo = useCallback(async () => {
    const info = await api.gachaInfo();
    setEggCost(info.eggCost);
  }, []);

  useEffect(() => {
    loadInfo().catch((err) => setError(String(err)));
  }, [loadInfo]);

  async function handleRoll() {
    setRolling(true);
    setError(null);
    try {
      const res = await api.gachaRoll();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="gacha">
      <h1>Œufs mystères</h1>
      {eggCost && (
        <p>
          Coût : {eggCost.amount} {eggCost.resource}
        </p>
      )}

      <button disabled={rolling} onClick={handleRoll}>
        {rolling ? "Ouverture..." : "Ouvrir un œuf"}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="gacha-result">
          <h2>{result.species.name}</h2>
          <p>Rareté : {result.species.rarity}</p>
          <p>{result.isNew ? "Nouveau Pokémon !" : `Doublon (x${result.quantity})`}</p>
          <p>
            Palier : {result.starTier.stars}★
            {result.starTier.nextThreshold !== null &&
              ` (prochain palier à ${result.starTier.nextThreshold} exemplaires)`}
          </p>
        </div>
      )}
    </div>
  );
}
