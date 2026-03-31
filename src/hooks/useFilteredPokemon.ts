import { useMemo } from "react";
import { PokemonSummary, FilterState, SortConfig, StatKey } from "../types/pokemon";
import { DEFAULT_STAT_RANGES } from "../constants/stats";
import { RESTRICTED_LEGENDARY_IDS } from "../constants/restrictedLegendaries";

const UNRESTRICTED_ABILITY_NAMES = new Set(["protosynthesis", "quark-drive", "beast-boost"]);

function isUnrestrictedSpecial(p: PokemonSummary): boolean {
  return (
    (p.isLegendary && !RESTRICTED_LEGENDARY_IDS.has(p.speciesId)) ||
    p.abilities.some((a) => UNRESTRICTED_ABILITY_NAMES.has(a.name))
  );
}

function isStatRangeDefault(ranges: FilterState["statRanges"]): boolean {
  return (Object.keys(DEFAULT_STAT_RANGES) as StatKey[]).every(
    (key) =>
      ranges[key][0] === DEFAULT_STAT_RANGES[key][0] &&
      ranges[key][1] === DEFAULT_STAT_RANGES[key][1]
  );
}

export function useFilteredPokemon(
  allPokemon: PokemonSummary[],
  filterState: FilterState,
  sortConfig: SortConfig
): PokemonSummary[] {
  return useMemo(() => {
    let result = allPokemon;

    // Text search
    const q = filterState.searchText.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.nameTw.includes(q) ||
          p.name.includes(q) ||
          String(p.speciesId).includes(q) ||
          String(p.id).includes(q)
      );
    }

    // Type filter
    if (filterState.types.length > 0) {
      if (filterState.typeFilterMode === "union") {
        result = result.filter((p) =>
          filterState.types.some((t) => p.types.includes(t))
        );
      } else {
        result = result.filter((p) =>
          filterState.types.every((t) => p.types.includes(t))
        );
      }
    }

    // Single / dual type count filter
    if (filterState.singleTypeOnly && !filterState.dualTypeOnly) {
      result = result.filter((p) => p.types.length === 1);
    } else if (filterState.dualTypeOnly && !filterState.singleTypeOnly) {
      result = result.filter((p) => p.types.length === 2);
    }
    // both checked or both unchecked → no restriction

    // Generation filter
    if (filterState.generations.length > 0) {
      result = result.filter((p) => filterState.generations.includes(p.generation));
    }

    // Special Pokémon filter (tri-state: only / exclude / null)
    {
      const isRestricted = (p: PokemonSummary) => p.isLegendary && RESTRICTED_LEGENDARY_IDS.has(p.speciesId);
      const isUnrestricted = (p: PokemonSummary) => isUnrestrictedSpecial(p);
      const isMythical = (p: PokemonSummary) => p.isMythical;

      const onlyFns: ((p: PokemonSummary) => boolean)[] = [];
      const excludeFns: ((p: PokemonSummary) => boolean)[] = [];

      if (filterState.restrictedFilter === "only")   onlyFns.push(isRestricted);
      if (filterState.restrictedFilter === "exclude") excludeFns.push(isRestricted);
      if (filterState.unrestrictedFilter === "only")   onlyFns.push(isUnrestricted);
      if (filterState.unrestrictedFilter === "exclude") excludeFns.push(isUnrestricted);
      if (filterState.mythicalFilter === "only")   onlyFns.push(isMythical);
      if (filterState.mythicalFilter === "exclude") excludeFns.push(isMythical);

      if (onlyFns.length > 0 || excludeFns.length > 0) {
        result = result.filter((p) => {
          if (onlyFns.length > 0 && !onlyFns.some((fn) => fn(p))) return false;
          if (excludeFns.some((fn) => fn(p))) return false;
          return true;
        });
      }
    }

    // Ability filter (union: any selected ability matches)
    if (filterState.abilityFilter.length > 0) {
      const abilitySet = new Set(filterState.abilityFilter);
      result = result.filter((p) =>
        p.abilities.some((a) => abilitySet.has(a.name))
      );
    }

    // Evolution filter (tri-state per category)
    {
      const evoEntries = Object.entries(filterState.evolutionFilter) as [string, string][];
      const evoOnlyCats = evoEntries.filter(([, v]) => v === "only").map(([k]) => k);
      const evoExcludeCats = evoEntries.filter(([, v]) => v === "exclude").map(([k]) => k);

      if (evoOnlyCats.length > 0 || evoExcludeCats.length > 0) {
        const evolvedFromSpeciesIds = new Set<number>();
        const childSpeciesByParent = new Map<number, Set<number>>();
        const speciesWithPreEvo = new Set<number>();

        for (const p of allPokemon) {
          if (p.evolvesFromId !== null) {
            evolvedFromSpeciesIds.add(p.evolvesFromId);
            speciesWithPreEvo.add(p.speciesId);
            const set = childSpeciesByParent.get(p.evolvesFromId) ?? new Set<number>();
            set.add(p.speciesId);
            childSpeciesByParent.set(p.evolvesFromId, set);
          }
        }

        const matchCat = (p: PokemonSummary, cat: string): boolean => {
          const hasPreEvo = p.evolvesFromId !== null;
          const hasNextEvo = evolvedFromSpeciesIds.has(p.speciesId);
          const childSpeciesCount = childSpeciesByParent.get(p.speciesId)?.size ?? 0;
          const parentAlsoHasPreEvo = p.evolvesFromId !== null && speciesWithPreEvo.has(p.evolvesFromId);
          switch (cat) {
            case "final":     return hasPreEvo && !hasNextEvo;
            case "solo":      return !hasPreEvo && !hasNextEvo && !p.hasMega;
            case "baby":      return !hasPreEvo && hasNextEvo;
            case "mega":      return p.name.includes("-mega") || p.name.includes("-primal");
            case "has-mega":  return p.hasMega && !p.name.includes("-mega") && !p.name.includes("-primal");
            case "middle":    return hasPreEvo && hasNextEvo;
            case "twice":     return parentAlsoHasPreEvo;
            case "branching": return childSpeciesCount > 1;
            default: return false;
          }
        };

        result = result.filter((p) => {
          if (evoOnlyCats.length > 0 && !evoOnlyCats.some((cat) => matchCat(p, cat))) return false;
          if (evoExcludeCats.some((cat) => matchCat(p, cat))) return false;
          return true;
        });
      }
    }

    // Move filter (intersection: Pokémon must be able to learn ALL selected moves)
    if (filterState.moveFilter.length > 0) {
      result = result.filter((p) =>
        filterState.moveFilter.every((move) =>
          move.learnedByPokemon.some((lp) => lp.id === p.id || lp.name === p.name)
        )
      );
    }

    // Stat range filters
    if (!isStatRangeDefault(filterState.statRanges)) {
      result = result.filter((p) => {
        const s = p.stats;
        const r = filterState.statRanges;
        return (
          s.hp >= r.hp[0] && s.hp <= r.hp[1] &&
          s.attack >= r.attack[0] && s.attack <= r.attack[1] &&
          s.defense >= r.defense[0] && s.defense <= r.defense[1] &&
          s.spAtk >= r.spAtk[0] && s.spAtk <= r.spAtk[1] &&
          s.spDef >= r.spDef[0] && s.spDef <= r.spDef[1] &&
          s.speed >= r.speed[0] && s.speed <= r.speed[1] &&
          s.total >= r.total[0] && s.total <= r.total[1]
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortConfig.key) {
        case "id":     aVal = a.speciesId * 100000 + (a.id % 100000); bVal = b.speciesId * 100000 + (b.id % 100000); break;
        case "nameTw": aVal = a.nameTw; bVal = b.nameTw; break;
        case "height": aVal = a.height; bVal = b.height; break;
        case "weight": aVal = a.weight; bVal = b.weight; break;
        default:
          aVal = a.stats[sortConfig.key as StatKey];
          bVal = b.stats[sortConfig.key as StatKey];
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allPokemon, filterState, sortConfig]);
}
