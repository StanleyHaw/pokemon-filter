/**
 * Compute local avatar URL from PokéAPI Pokémon name.
 * Files live in /public/avatar/ and are served at <BASE_URL>avatar/<name>.png.
 *
 * Naming convention: remove all hyphens, lowercase.
 * e.g. "mr-mime" → "mrmime", "deoxys-normal" → try "deoxysnormal" then fall back to "deoxys"
 *
 * The fallback (base name before first hyphen) handles form-variant Pokémon whose
 * avatar file uses only the base name (e.g. deoxys-normal → deoxys.png).
 */
const BASE = import.meta.env.BASE_URL;

const AVATAR_OVERRIDES: Record<string, string> = {
  "meowstic-female":            "meowsticf.png",
  "basculegion-female":         "basculegionf.png",
  "necrozma-dusk-mane":         "necrozmadawnwings.png",
  "necrozma-dawn-wings":        "necrozmaduskmane.png",
  "tauros-paldea-combat-breed": "taurospaldeacombat.png",
  "tauros-paldea-blaze-breed":  "taurospaldeablaze.png",
  "tauros-paldea-aqua-breed":   "taurospaldeaaqua.png",
};

export function getAvatarUrl(pokemonName: string): string {
  if (AVATAR_OVERRIDES[pokemonName]) return `${BASE}avatar/${AVATAR_OVERRIDES[pokemonName]}`;
  const full = pokemonName.replace(/-/g, "").toLowerCase();
  return `${BASE}avatar/${full}.png`;
}

/**
 * Fallback URL for Pokémon whose full-name file doesn't exist.
 * e.g. "deoxys-normal" → "<BASE>avatar/deoxys.png"
 */
export function getAvatarFallbackUrl(pokemonName: string): string {
  const base = pokemonName.split("-")[0].toLowerCase();
  return `${BASE}avatar/${base}.png`;
}
