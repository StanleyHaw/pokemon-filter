const iconModules = import.meta.glob<string>(
  "../assets/type/*.png",
  { eager: true, query: "?url", import: "default" }
);

const iconMap: Record<string, string> = {};
for (const [path, url] of Object.entries(iconModules)) {
  // path: "../assets/type/pokemon-type-fire.png" → key: "fire"
  const match = path.match(/pokemon-type-([a-z]+)\.png$/);
  if (match) iconMap[match[1]] = url;
}

export function getTypeIconUrl(type: string): string {
  return iconMap[type] ?? "";
}
