import {
  describeByScope,
  SCOPE_ICON,
  SCOPE_LABEL,
  type EffectScope,
  type TraitEffect,
} from "@pokerancher/shared";

/**
 * A tier's effects, grouped under a Refuge / Expédition heading.
 *
 * Shared by the synergy rail and the Codex sheet on purpose: the same trait has
 * to read identically wherever the player meets it, and the answer they want is
 * always the same one — does this help me farm, or help me fight?
 */

const SCOPES: EffectScope[] = ["farm", "combat"];

export function EffectGroups({
  effects,
  muted,
}: {
  effects: readonly TraitEffect[];
  muted?: boolean;
}) {
  const grouped = describeByScope(effects);

  return (
    <span className={`fx-groups ${muted ? "fx-muted" : ""}`}>
      {SCOPES.filter((scope) => grouped[scope].length > 0).map((scope) => (
        <span key={scope} className={`fx-group fx-${scope}`}>
          <span className="fx-scope">
            <span aria-hidden="true">{SCOPE_ICON[scope]}</span> {SCOPE_LABEL[scope]}
          </span>
          {grouped[scope].map((text) => (
            <span key={text} className="fx-line">
              {text}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
