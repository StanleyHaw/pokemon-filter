import { useMemo } from "react";
import { PokemonSummary, FilterState, SortConfig, StatKey } from "../types/pokemon";
import { DEFAULT_STAT_RANGES } from "../constants/stats";
import { RESTRICTED_LEGENDARY_IDS } from "../constants/restrictedLegendaries";
import { useShowdownStore } from "../stores/useShowdownStore";
import { canLearnAllMovesInChain } from "../lib/showdown/normalizeLearnset";
import { toShowdownId, resolveLearnsetId } from "../lib/showdown/showdownId";
import { canSatisfyMoveGroupConditions } from "../lib/showdown/queryMoveGroups";

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
  const { learnsetIndex, speciesLearnsetMap, species: showdownSpecies, moves } = useShowdownStore();

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

    // Move filter + Move group filter（合併為一次查詢避免重複展開進化鏈）
    const hasDirectMoves = filterState.moveFilter.length > 0;
    const hasGroupFilter = filterState.moveGroupFilter.length > 0;

    if (hasDirectMoves || hasGroupFilter) {
      if (learnsetIndex) {
        if (hasGroupFilter) {
          // Group 路徑：透過 getMatchedMovesByConditions 合併處理 group + direct
          const directMoveIds = filterState.moveFilter.map((m) => toShowdownId(m.name));
          result = result.filter((p) => {
            const speciesId =
              speciesLearnsetMap.get(toShowdownId(p.name)) ??
              resolveLearnsetId(p.name, learnsetIndex.bySpecies);
            return canSatisfyMoveGroupConditions(
              speciesId,
              { anyOfGroups: filterState.moveGroupFilter, allOfMoves: directMoveIds },
              learnsetIndex,
              showdownSpecies
            );
          });
        } else {
          // 純 direct move 路徑（原有邏輯不變）
          const moveIds = filterState.moveFilter.map((m) => toShowdownId(m.name));
          result = result.filter((p) => {
            const speciesId =
              speciesLearnsetMap.get(toShowdownId(p.name)) ??
              resolveLearnsetId(p.name, learnsetIndex.bySpecies);
            return canLearnAllMovesInChain(learnsetIndex, speciesId, moveIds, showdownSpecies);
          });
        }
      } else {
        // PokéAPI 降級路徑（僅處理 direct moves，group 需要 Showdown 資料）
        if (hasDirectMoves) {
          result = result.filter((p) =>
            filterState.moveFilter.every((move) =>
              move.learnedByPokemon.some((lp) => lp.id === p.id || lp.name === p.name)
            )
          );
        }
      }
    }

    // Move tag filter: Pokémon's learnset must contain at least one move matching ALL selected tags
    if (filterState.moveTagFilter.length > 0 && moves) {
      const tags = filterState.moveTagFilter;
      result = result.filter((p) => {
        const speciesId =
          speciesLearnsetMap.get(toShowdownId(p.name)) ??
          (learnsetIndex ? resolveLearnsetId(p.name, learnsetIndex.bySpecies) : toShowdownId(p.name));

        // Collect all move IDs this Pokémon can learn (self + prevo chain)
        const chain = learnsetIndex
          ? [speciesId, ...(() => {
              const preChain: string[] = [];
              let cur = speciesId;
              const visited = new Set<string>();
              while (true) {
                const sp = showdownSpecies[cur];
                if (!sp?.prevo) break;
                const prevoId = toShowdownId(sp.prevo);
                if (visited.has(prevoId)) break;
                visited.add(prevoId);
                preChain.push(prevoId);
                cur = prevoId;
              }
              return preChain;
            })()]
          : [speciesId];

        const learnableMoveIds = new Set<string>();
        for (const id of chain) {
          const sp = showdownSpecies[id];
          const lookupId = sp?.learnsetId ?? id;
          learnsetIndex?.bySpecies.get(lookupId)?.forEach((m) => learnableMoveIds.add(m));
        }

        // Check if any learnable move satisfies all selected tags
        return [...learnableMoveIds].some((moveId) => {
          const move = moves[moveId];
          return move && tags.every((tag) => move.tags[tag]);
        });
      });
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
  }, [allPokemon, filterState, sortConfig, learnsetIndex, speciesLearnsetMap, showdownSpecies, moves]); // filterState includes moveGroupFilter
}
