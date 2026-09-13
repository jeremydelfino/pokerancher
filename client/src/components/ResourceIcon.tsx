export const RESOURCE_LABEL: Record<string, string> = {
  berry: "Baies",
  fish: "Poissons",
  wood: "Bois",
  ore: "Minerai",
  egg_shard: "Éclats",
};

export function resourceLabel(resource: string): string {
  return RESOURCE_LABEL[resource] ?? resource;
}

export function ResourceIcon({ resource, size = 14 }: { resource: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "#fff", "aria-hidden": true } as const;

  switch (resource) {
    case "berry":
      return (
        <svg {...common}>
          <circle cx="12" cy="14.5" r="6.5" />
          <path d="M12 8c0-3 2-5 5-5.5C17 6 15 8.5 12 8Z" opacity="0.75" />
        </svg>
      );
    case "fish":
      return (
        <svg {...common}>
          <path d="M3 12c3.5-4.5 8-6 12-6 2.6 0 4.4 1 5.4 2.2-1 1.2-1 5.4 0 6.6-1 1.2-2.8 2.2-5.4 2.2-4 0-8.5-1.5-12-5Z" />
          <circle cx="16.6" cy="10.6" r="1.1" fill="#2f3a33" />
        </svg>
      );
    case "wood":
      return (
        <svg {...common}>
          <rect x="2.5" y="7" width="19" height="10" rx="5" />
          <ellipse cx="7" cy="12" rx="2.6" ry="3.6" fill="#2f3a33" opacity="0.28" />
        </svg>
      );
    case "ore":
      return (
        <svg {...common}>
          <path d="M12 2.5 21 10l-9 11.5L3 10Z" />
          <path d="M12 2.5 21 10h-9Z" fill="#2f3a33" opacity="0.22" />
        </svg>
      );
    case "egg_shard":
      return (
        <svg {...common}>
          <path d="M12 2c4 3.4 6.5 7.4 6.5 11a6.5 6.5 0 0 1-13 0C5.5 9.4 8 5.4 12 2Z" />
          <path d="M12 8.5 9 12l3 1.5L9.5 18" stroke="#2f3a33" strokeWidth="1.4" fill="none" opacity="0.35" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
