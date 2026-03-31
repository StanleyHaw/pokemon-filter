import pokemonListData from "../data/pokemon_list.json";

const NAME_MAP = new Map<number, string>(
  (pokemonListData as Array<{ id: number; zh_tw: string }>).map((p) => [p.id, p.zh_tw])
);

/** Get Traditional Chinese name for a Pokémon by its numeric ID */
export function getPokemonNameTw(id: number): string {
  return NAME_MAP.get(id) ?? "";
}

/**
 * Apply Mega/Primal prefix to a base Traditional Chinese name.
 * - `-primal`         → 原始＿＿＿  (Kyogre/Groudon only)
 * - `-mega-x/y/z`    → 超級＿＿＿X/Y/Z
 * - `-mega`           → 超級＿＿＿
 * Returns the base name unchanged if none of the above apply.
 */
export function applyFormPrefix(pokemonName: string, baseName: string): string {
  if (pokemonName.includes("-primal")) return `原始${baseName}`;
  const splitMatch = pokemonName.match(/-mega-([xyz])$/i);
  if (splitMatch) return `超級${baseName}${splitMatch[1].toUpperCase()}`;
  if (pokemonName.includes("-mega")) return `超級${baseName}`;
  return baseName;
}
