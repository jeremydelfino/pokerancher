import { useEffect, useRef, useState } from "react";
import { useCountUp } from "../hooks/useCountUp.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";

interface Props {
  resource: string;
  amount: number;
  showLabel?: boolean;
}

export function ResourcePill({ resource, amount, showLabel = false }: Props) {
  const display = useCountUp(amount);
  const [bump, setBump] = useState(false);
  const previous = useRef(amount);

  useEffect(() => {
    if (amount > previous.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 420);
      previous.current = amount;
      return () => clearTimeout(timer);
    }
    previous.current = amount;
  }, [amount]);

  return (
    <span
      className={`res-pill ${bump ? "res-pill-bump" : ""}`}
      title={`${resourceLabel(resource)} : ${amount}`}
    >
      <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${resource}, var(--amber))` }}>
        <ResourceIcon resource={resource} />
      </span>
      {showLabel && <span className="res-name">{resourceLabel(resource)}</span>}
      {display.toLocaleString("fr-FR")}
    </span>
  );
}
