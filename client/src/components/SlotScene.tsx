/** A small hand-drawn diorama per Refuge pen, so each job reads at a glance. */

export const SCENE_COLORS: Record<string, { sky: string; ground: string }> = {
  BERRY_FARM: { sky: "#d5f0e0", ground: "#a8dba4" },
  FISHING_DOCK: { sky: "#cfeaf7", ground: "#7fc8e4" },
  WOODCUTTING: { sky: "#dff0d8", ground: "#8fbd7f" },
  MINING: { sky: "#ded9ee", ground: "#a9a5c4" },
};

export function SlotScene({ slotType }: { slotType: string }) {
  return (
    <svg className="slot-scene-art" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {slotType === "BERRY_FARM" && (
        <>
          <path d="M0 108 C60 96 110 116 170 108 C220 101 260 110 300 104 L300 150 L0 150Z" fill="#7db974" />
          <g fill="#4f9c5e">
            <circle cx="52" cy="104" r="22" />
            <circle cx="80" cy="110" r="17" />
            <circle cx="238" cy="106" r="20" />
            <circle cx="214" cy="113" r="14" />
          </g>
          <g fill="#e05c72">
            <circle cx="46" cy="98" r="4" />
            <circle cx="62" cy="108" r="4" />
            <circle cx="80" cy="104" r="3.5" />
            <circle cx="240" cy="100" r="4" />
            <circle cx="228" cy="112" r="3.5" />
          </g>
        </>
      )}

      {slotType === "FISHING_DOCK" && (
        <>
          <path d="M0 96 C70 88 120 100 190 94 C240 90 270 96 300 92 L300 150 L0 150Z" fill="#4fa9cd" opacity="0.95" />
          <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" fill="none">
            <path d="M24 116 q10 -6 20 0 t20 0" />
            <path d="M186 128 q10 -6 20 0 t20 0" />
            <path d="M96 138 q10 -6 20 0 t20 0" />
          </g>
          <g fill="#b98a4f">
            <rect x="18" y="84" width="84" height="9" rx="3" />
            <rect x="28" y="93" width="7" height="36" rx="3" />
            <rect x="84" y="93" width="7" height="36" rx="3" />
          </g>
        </>
      )}

      {slotType === "WOODCUTTING" && (
        <>
          <path d="M0 104 C70 94 130 112 200 104 C245 99 275 106 300 100 L300 150 L0 150Z" fill="#6fa562" />
          <g>
            <path d="M44 104 L60 60 L76 104 Z" fill="#3f7f55" />
            <path d="M40 116 L60 78 L80 116 Z" fill="#4f9c5e" />
            <rect x="56" y="112" width="8" height="16" rx="2" fill="#8a6234" />
            <path d="M228 108 L244 66 L260 108 Z" fill="#3f7f55" />
            <path d="M224 120 L244 84 L264 120 Z" fill="#4f9c5e" />
            <rect x="240" y="116" width="8" height="14" rx="2" fill="#8a6234" />
          </g>
        </>
      )}

      {slotType === "MINING" && (
        <>
          <path d="M0 92 L52 56 L104 92 L150 62 L206 96 L258 64 L300 96 L300 150 L0 150Z" fill="#8d8aa8" />
          <path d="M0 118 C60 108 120 124 190 116 C240 110 270 118 300 112 L300 150 L0 150Z" fill="#6f6c8c" />
          <g>
            <path d="M62 118 L70 92 L78 118 Z" fill="#b689f5" opacity="0.95" />
            <path d="M214 116 L222 88 L230 116 Z" fill="#8fd3ee" opacity="0.95" />
            <path d="M232 120 L238 102 L244 120 Z" fill="#b689f5" opacity="0.8" />
          </g>
        </>
      )}
    </svg>
  );
}
