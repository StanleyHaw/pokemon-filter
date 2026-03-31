/**
 * Compute local avatar URL from PokéAPI Pokémon name.
 * Files live in /public/avatar/ and are served at /avatar/<name>.png.
 *
 * Naming convention: remove all hyphens, lowercase.
 * e.g. "mr-mime" → "mrmime", "deoxys-normal" → try "deoxysnormal" then fall back to "deoxys"
 *
 * The fallback (base name before first hyphen) handles form-variant Pokémon whose
 * avatar file uses only the base name (e.g. deoxys-normal → deoxys.png).
 */
const AVATAR_OVERRIDES: Record<string, string> = {
  "meowstic-female":            "/avatar/meowsticf.png",
  "basculegion-female":         "/avatar/basculegionf.png",
  "necrozma-dusk-mane":         "/avatar/necrozmadawnwings.png",
  "necrozma-dawn-wings":        "/avatar/necrozmaduskmane.png",
  "tauros-paldea-combat-breed": "/avatar/taurospaldeacombat.png",
  "tauros-paldea-blaze-breed":  "/avatar/taurospaldeablaze.png",
  "tauros-paldea-aqua-breed":   "/avatar/taurospaldeaaqua.png",
};

export function getAvatarUrl(pokemonName: string): string {
  if (AVATAR_OVERRIDES[pokemonName]) return AVATAR_OVERRIDES[pokemonName];
  const full = pokemonName.replace(/-/g, "").toLowerCase();
  return `/avatar/${full}.png`;
}

/**
 * Fallback URL for Pokémon whose full-name file doesn't exist.
 * e.g. "deoxys-normal" → "/avatar/deoxys.png"
 */
export function getAvatarFallbackUrl(pokemonName: string): string {
  const base = pokemonName.split("-")[0].toLowerCase();
  return `/avatar/${base}.png`;
}
