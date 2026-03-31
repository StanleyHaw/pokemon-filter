import {
  getAllPokemon,
  putPokemonBatch,
  getMeta,
  setMeta,
} from "../db/pokemonDB";
import {
  fetchPokemonList,
  fetchPokemon,
  fetchSpecies,
  fetchAbility,
  extractIdFromUrl,
  getGenerationNumber,
  getNameTw,
  RawPokemon,
  RawSpecies,
} from "./pokeapi";
import { PokemonSummary } from "../types/pokemon";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 300;

export type LoadingState = "idle" | "loading" | "partial" | "complete" | "error";

export interface DataLoaderCallbacks {
  onProgress: (loaded: number, total: number) => void;
  onPartialReady: (pokemon: PokemonSummary[]) => void;
  onComplete: (pokemon: PokemonSummary[]) => void;
  onError: (error: Error) => void;
  onStateChange: (state: LoadingState) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cosmetic / redundant variant prefixes to skip
const SKIP_PREFIXES = [
  "pikachu-",
  "unown-",
  "alcremie-",
  "vivillon-",
  "furfrou-",
  "minior-",
  "flabebe-",
  "floette-",
  "florges-",
];

const SKIP_CONTAINS = [
  "-totem",
  "-cap",
  "-partner",
  "-gmax",
  "-spiky",
  "-starter",
  "-mega",
  "-primal",
];

const SKIP_SUFFIXES: string[] = [];

// Always skip these exact names, even if is_default=true
const ALWAYS_SKIP_NAMES = new Set<string>([]);

// Force-include these exact names even if they would be skipped by prefix/suffix rules
const FORCE_INCLUDE_NAMES = new Set([
  "minior-red", // core form representative
]);

// Skip these exact non-default form names
const SKIP_FORM_EXACT = new Set([
  "mimikyu-busted",
  "maushold-family-of-three",
  "dudunsparce-three-segment",
  "keldeo-resolute",
  "greninja-battle-bond",
  "zarude-dada",
  "squawkabilly-blue-plumage",
  "squawkabilly-yellow-plumage",
  "squawkabilly-white-plumage",
  "magearna-original",
  "eternatus-eternamax",
]);

function shouldIncludeForm(name: string, isDefault: boolean): boolean {
  if (ALWAYS_SKIP_NAMES.has(name)) return false;
  if (isDefault) return true;
  if (FORCE_INCLUDE_NAMES.has(name)) return true;
  if (SKIP_FORM_EXACT.has(name)) return false;
  if (SKIP_PREFIXES.some((p) => name.startsWith(p))) return false;
  if (SKIP_CONTAINS.some((s) => name.includes(s))) return false;
  if (SKIP_SUFFIXES.some((s) => name.endsWith(s))) return false;
  return true;
}

function sortKey(p: PokemonSummary): number {
  // Sort by species ID first so forms appear next to their base, then by form ID
  return p.speciesId * 100000 + (p.id % 100000);
}

async function transformPokemon(
  raw: RawPokemon,
  species: RawSpecies,
  abilityNames: Map<string, string>
): Promise<PokemonSummary> {
  const stats = { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, total: 0 };
  for (const s of raw.stats) {
    switch (s.stat.name) {
      case "hp":             stats.hp      = s.base_stat; break;
      case "attack":         stats.attack  = s.base_stat; break;
      case "defense":        stats.defense = s.base_stat; break;
      case "special-attack": stats.spAtk   = s.base_stat; break;
      case "special-defense":stats.spDef   = s.base_stat; break;
      case "speed":          stats.speed   = s.base_stat; break;
    }
  }
  stats.total = stats.hp + stats.attack + stats.defense + stats.spAtk + stats.spDef + stats.speed;

  const speciesId = extractIdFromUrl(raw.species.url);
  const nameTw = getNameTw(species.names) || raw.name;

  const abilities = raw.abilities.map((a) => ({
    name: a.ability.name,
    nameTw: abilityNames.get(a.ability.name) || a.ability.name,
    isHidden: a.is_hidden,
  }));

  const artwork = raw.sprites?.other?.["official-artwork"];

  const evolvesFromId = species.evolves_from_species
    ? extractIdFromUrl(species.evolves_from_species.url)
    : null;

  const hasMega = species.varieties.some(
    (v) => !v.is_default && (v.pokemon.name.includes("-mega") || v.pokemon.name.includes("-primal"))
  );

  return {
    id: raw.id,
    speciesId,
    name: raw.name,
    nameTw,
    types: raw.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    abilities,
    height: raw.height,
    weight: raw.weight,
    stats,
    generation: getGenerationNumber(species.generation.name),
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    evolvesFromId,
    hasMega,
    spriteUrl: artwork?.front_default ?? "",
    spriteShinyUrl: artwork?.front_shiny ?? "",
  };
}

async function fetchAbilityNamesTw(abilityNames: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(abilityNames)];
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    batches.push(unique.slice(i, i + 10));
  }
  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map((name) => fetchAbility(name)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        const ab = result.value;
        const tw = getNameTw(ab.names);
        if (tw) map.set(ab.name, tw);
      }
    }
    await sleep(200);
  }
  return map;
}

export async function initializeData(callbacks: DataLoaderCallbacks): Promise<void> {
  const { onProgress, onPartialReady, onComplete, onError, onStateChange } = callbacks;

  try {
    onStateChange("loading");

    // Check cache freshness (v4 includes alternate forms + speciesId)
    const lastFetched = await getMeta<number>("pokemon_last_fetched_v6");
    const cachedCount = await getMeta<number>("pokemon_count_v6");

    if (lastFetched && cachedCount && Date.now() - lastFetched < CACHE_TTL_MS) {
      const cached = await getAllPokemon();
      if (cached.length >= cachedCount * 0.95) {
        onStateChange("complete");
        onComplete(cached);
        return;
      }
    }

    // Fetch manifest (1350 entries: 1025 base + ~325 alternate forms)
    const list = await fetchPokemonList();
    const total = list.length;
    onProgress(0, total);

    const allPokemon: PokemonSummary[] = [];
    let partialReady = false;

    // Process in batches
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (entry) => {
          const id = extractIdFromUrl(entry.url);
          // Fetch raw pokemon first so we can check is_default and get species URL
          const raw = await fetchPokemon(id);
          if (!shouldIncludeForm(raw.name, raw.is_default)) return null;
          // For alternate forms (id 10001+), species endpoint by pokemon ID returns 404;
          // use the species URL embedded in the raw pokemon data instead.
          const speciesId = extractIdFromUrl(raw.species.url);
          const species = await fetchSpecies(speciesId).catch(() => null);
          if (!species) return null;
          return { raw, species };
        })
      );

      // Collect ability names for this batch
      const batchAbilityNames: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          batchAbilityNames.push(...r.value.raw.abilities.map((a) => a.ability.name));
        }
      }
      const abilityMap = await fetchAbilityNamesTw(batchAbilityNames);

      const batchPokemon: PokemonSummary[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          try {
            const p = await transformPokemon(r.value.raw, r.value.species, abilityMap);
            batchPokemon.push(p);
          } catch {
            // skip malformed entries
          }
        }
      }

      if (batchPokemon.length > 0) {
        await putPokemonBatch(batchPokemon);
        allPokemon.push(...batchPokemon);
        allPokemon.sort((a, b) => sortKey(a) - sortKey(b));
      }

      onProgress(Math.min(i + BATCH_SIZE, total), total);

      // Signal partial ready after first 151 base pokemon
      if (!partialReady && allPokemon.filter((p) => p.speciesId <= 151).length >= 151) {
        partialReady = true;
        onStateChange("partial");
        onPartialReady([...allPokemon]);
      }

      if (i + BATCH_SIZE < list.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    await setMeta("pokemon_last_fetched_v6", Date.now());
    await setMeta("pokemon_count_v6", allPokemon.length);

    onStateChange("complete");
    onComplete(allPokemon.sort((a, b) => sortKey(a) - sortKey(b)));
  } catch (err) {
    onStateChange("error");
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
