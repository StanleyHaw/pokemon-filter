const BASE_URL = "https://pokeapi.co/api/v2";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: { name: string; url: string } }[];
  abilities: {
    ability: { name: string; url: string };
    is_hidden: boolean;
    slot: number;
  }[];
  stats: {
    base_stat: number;
    stat: { name: string };
  }[];
  sprites: {
    other?: {
      "official-artwork"?: {
        front_default: string | null;
        front_shiny: string | null;
      };
    };
  };
  is_default: boolean;
  species: { name: string; url: string };
}

export interface RawSpecies {
  id: number;
  is_legendary: boolean;
  is_mythical: boolean;
  generation: { name: string; url: string };
  names: { name: string; language: { name: string } }[];
  evolves_from_species: { name: string; url: string } | null;
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
}

export interface RawAbility {
  name: string;
  names: { name: string; language: { name: string } }[];
}

export interface RawMove {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  type: { name: string };
  damage_class: { name: string };
  meta: { category: { name: string } } | null;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  effect_entries: { short_effect: string; language: { name: string } }[];
  learned_by_pokemon: { name: string; url: string }[];
  target?: { name: string; url: string };
}

export async function fetchPokemonList(limit = 1350, offset = 0): Promise<{ name: string; url: string }[]> {
  const data = await fetchJSON(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`) as { results: { name: string; url: string }[] };
  return data.results;
}

export async function fetchPokemon(idOrName: string | number): Promise<RawPokemon> {
  return fetchJSON(`${BASE_URL}/pokemon/${idOrName}`) as Promise<RawPokemon>;
}

export async function fetchSpecies(idOrName: string | number): Promise<RawSpecies> {
  return fetchJSON(`${BASE_URL}/pokemon-species/${idOrName}`) as Promise<RawSpecies>;
}

export async function fetchAbility(name: string): Promise<RawAbility> {
  return fetchJSON(`${BASE_URL}/ability/${name}`) as Promise<RawAbility>;
}

export async function fetchMove(nameOrId: string | number): Promise<RawMove> {
  return fetchJSON(`${BASE_URL}/move/${nameOrId}`) as Promise<RawMove>;
}

export async function fetchMoveList(limit = 937): Promise<{ name: string; url: string }[]> {
  const data = await fetchJSON(`${BASE_URL}/move?limit=${limit}`) as { results: { name: string; url: string }[] };
  return data.results;
}

export async function fetchMovesByType(typeName: string): Promise<{ name: string; url: string }[]> {
  const data = await fetchJSON(`${BASE_URL}/type/${typeName}`) as { moves: { name: string; url: string }[] };
  return data.moves;
}

export function extractIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

export function getGenerationNumber(genName: string): number {
  const map: Record<string, number> = {
    "generation-i": 1,
    "generation-ii": 2,
    "generation-iii": 3,
    "generation-iv": 4,
    "generation-v": 5,
    "generation-vi": 6,
    "generation-vii": 7,
    "generation-viii": 8,
    "generation-ix": 9,
  };
  return map[genName] ?? 1;
}

export function getNameTw(names: { name: string; language: { name: string } }[]): string {
  const zhHant = names.find((n) => n.language.name === "zh-Hant");
  if (zhHant) return zhHant.name;
  const zhHans = names.find((n) => n.language.name === "zh-Hans");
  if (zhHans) return zhHans.name;
  return "";
}
