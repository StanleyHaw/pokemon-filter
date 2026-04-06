import { useMemo } from "react";
import { PokemonSummary, FilterState, SortConfig, StatKey, MoveGroupId } from "../types/pokemon";
import { DEFAULT_STAT_RANGES } from "../constants/stats";
import { RESTRICTED_LEGENDARY_IDS } from "../constants/restrictedLegendaries";
import { useShowdownStore } from "../stores/useShowdownStore";
import { canLearnAllMovesInChain } from "../lib/showdown/normalizeLearnset";
import { toShowdownId, resolveLearnsetId } from "../lib/showdown/showdownId";
import { canSatisfyMoveGroupConditions } from "../lib/showdown/queryMoveGroups";
import { ABILITY_GROUPS, normalizeAbilityId } from "../constants/abilityGroups";
import { MOVE_GROUPS } from "../constants/moveGroups";

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

    // ── Tactical move filter helpers ──────────────────────────────────────────
    const tf = filterState.tacticalMoveFilters;
    const hasTactical = !!moves && (
      tf.damageClass !== '' ||
      tf.type !== '' ||
      tf.powerMin > 0 ||
      tf.powerMax < 250 ||
      tf.accuracyMin > 0 ||
      tf.accuracyMax < 100
    );

    /** 判斷單個招式是否符合所有 tactical 條件（無資料時保留） */
    const applyTacticalMove = (moveId: string): boolean => {
      const move = moves?.[moveId];
      if (!move) return true;
      if (tf.damageClass && move.category !== tf.damageClass) return false;
      if (tf.type && move.type.toLowerCase() !== tf.type.toLowerCase()) return false;
      if (tf.powerMin > 0 || tf.powerMax < 250) {
        if (tf.powerMin > 0 && move.basePower === 0) return false;
        if (move.basePower < tf.powerMin || move.basePower > tf.powerMax) return false;
      }
      if (tf.accuracyMin > 0 || tf.accuracyMax < 100) {
        if (move.accuracy === null) {
          if (tf.accuracyMin > 0) return false;
        } else {
          if (move.accuracy < tf.accuracyMin || move.accuracy > tf.accuracyMax) return false;
        }
      }
      return true;
    };

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

    // Ability group filter（群組間 AND，群組內 OR）
    //
    // 語意：對每個選中的群組，Pokémon 至少要有一個可用特性（特性一/二/隱藏特性）
    // 屬於該群組，所有選中群組都需命中（群組間 AND）。
    //
    // ⚠️ 判斷以「任一可用特性集合」為準，不是「實戰同時啟用的單一特性」。
    // 例：某隻 Pokémon 有 [intimidate, cloud-nine]，兩者都參與比對。
    // 若未來需要「只能選一個特性上場」的嚴格模式，需在 FilterState 新增 abilitySlotFilter。
    //
    // 與 abilityFilter 的關係：兩者之間是 AND，都需要通過才保留。
    // 比對時透過 normalizeAbilityId 轉換，不直接假設 slug 格式。
    if (filterState.abilityGroupFilter.length > 0) {
      result = result.filter((p) => {
        const pokemonAbilityIds = new Set(
          p.abilities.map((a) => normalizeAbilityId(a.name))
        );
        return filterState.abilityGroupFilter.every((groupId) =>
          ABILITY_GROUPS[groupId].abilityIds.some((id) =>
            pokemonAbilityIds.has(normalizeAbilityId(id))
          )
        );
      });
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
            case "solo":      return !hasPreEvo && !hasNextEvo;
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

    // ── 招式篩選 ────────────────────────────────────────────────────────────
    //
    // 兩套責任明確分離：
    //
    // A. direct move 路徑（moveFilter）
    //    寶可夢必須能學會所有指定招式（AND）
    //    不受 tacticalMoveFilters 影響
    //
    // B. tactical group 路徑（moveGroupFilter）
    //    只在有選擇群組時啟動；先以 tacticalMoveFilters 收斂各群組內的候選招式，
    //    再判斷寶可夢是否能學到。
    //    - 靜態群組：從 MOVE_GROUPS[id].moveIds 篩選
    //    - tag-backed 群組（groupDef.tag 存在）：從 moves[id].tags 動態解析
    //    直接選招（moveFilter）在此路徑下作為 allOfMoves 一起處理

    const hasDirectMoves = filterState.moveFilter.length > 0;
    const hasGroupFilter = filterState.moveGroupFilter.length > 0;
    const hasMoveTagFilter = filterState.moveTagFilter.length > 0;

    // speciesLearnsetMap 的 key 集合，供 resolveLearnsetId 做 override 解析用
    // 目的：讓 PokéAPI 特有後綴（如 -mask、-breed）先對應到 pokedex key，再查 speciesLearnsetMap
    // 只在 learnsetIndex 存在時才有意義
    const speciesMapKeys: Map<string, Set<string>> = learnsetIndex
      ? new Map([...speciesLearnsetMap.keys()].map((k) => [k, new Set<string>()]))
      : new Map();

    if (hasDirectMoves || hasGroupFilter || hasMoveTagFilter) {
      if (learnsetIndex) {
        if (hasGroupFilter) {
          const directMoveIds = filterState.moveFilter.map((m) => toShowdownId(m.name));

          const refinedGroupMoves: Partial<Record<MoveGroupId, string[]>> = {};
          if (moves) {
            for (const groupId of filterState.moveGroupFilter) {
              const groupDef = MOVE_GROUPS[groupId];
              if (groupDef.tag) {
                const tagKey = groupDef.tag;
                refinedGroupMoves[groupId] = Object.keys(moves).filter(
                  (moveId) => moves[moveId]?.tags[tagKey] && (!hasTactical || applyTacticalMove(moveId))
                );
              } else if (hasTactical) {
                // 靜態群組有 tactical 條件時，也需要收斂候選招式清單
                refinedGroupMoves[groupId] = (MOVE_GROUPS[groupId].moveIds as string[]).filter(applyTacticalMove);
              }
            }
          }

          result = result.filter((p) => {
            // 三段 fallback，與 direct move 路徑保持一致
            const showdownId = toShowdownId(p.name);
            const mapped =
              speciesLearnsetMap.get(showdownId) ??
              speciesLearnsetMap.get(resolveLearnsetId(p.name, speciesMapKeys));
            const speciesId = mapped ?? resolveLearnsetId(p.name, learnsetIndex.bySpecies);
            return canSatisfyMoveGroupConditions(
              speciesId,
              { anyOfGroups: filterState.moveGroupFilter, allOfMoves: directMoveIds, refinedGroupMoves },
              learnsetIndex,
              showdownSpecies
            );
          });
        } else {
          // 純 direct move 路徑
          if (hasDirectMoves) {
            const moveIds = filterState.moveFilter.map((m) => toShowdownId(m.name));
            result = result.filter((p) => {
              const showdownId = toShowdownId(p.name);
              // 先直接查，若 miss 再透過 speciesMapKeys 做 override 解析後二次查
              // 目的：讓 PokéAPI 特有後綴（-mask / -breed 等）能正確命中 speciesLearnsetMap
              const mapped =
                speciesLearnsetMap.get(showdownId) ??
                speciesLearnsetMap.get(resolveLearnsetId(p.name, speciesMapKeys));
              const speciesId = mapped ?? resolveLearnsetId(p.name, learnsetIndex.bySpecies);
              return canLearnAllMovesInChain(learnsetIndex, speciesId, moveIds, showdownSpecies);
            });
          }
        }

        // ── moveTagFilter：獨立並行篩選（不作為群組子條件） ────────────
        //
        // 無論是否同時有 moveGroupFilter，tag 條件永遠作為獨立 pass 運行。
        // 語意：寶可夢 learnset 中至少有一個招式同時符合所有選中 tags。
        // 與 group 條件之間是 AND（各自獨立通過後才保留）。
        if (hasMoveTagFilter && moves) {
          const tags = filterState.moveTagFilter;
          result = result.filter((p) => {
            const speciesId =
              speciesLearnsetMap.get(toShowdownId(p.name)) ??
              resolveLearnsetId(p.name, learnsetIndex.bySpecies);

            const chain = [speciesId, ...(() => {
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
            })()];

            const learnableMoveIds = new Set<string>();
            for (const id of chain) {
              const sp = showdownSpecies[id];
              const lookupId = sp?.learnsetId ?? id;
              learnsetIndex.bySpecies.get(lookupId)?.forEach((m) => learnableMoveIds.add(m));
            }

            // 每個 tag 各自獨立：Pokémon learnset 中「至少一個招式符合該 tag」→ tag 通過
            // 與群組入口語意一致（OR-within, AND-between）
            return tags.every((tag) =>
              [...learnableMoveIds].some((moveId) => {
                const move = moves[moveId];
                return move && move.tags[tag];
              })
            );
          });
        }
      } else {
        // ── PokéAPI 降級路徑 ──────────────────────────────────────────────
        // 只處理 direct moves；group / tactical 需要 Showdown 資料
        if (hasDirectMoves) {
          result = result.filter((p) =>
            filterState.moveFilter.every((move) =>
              move.learnedByPokemon.some((lp) => lp.id === p.id || lp.name === p.name)
            )
          );
        }
      }
    }

    // Standalone tactical move filter（無 group / direct move 時獨立生效）
    // 條件：篩選出「進化鏈中至少有一招符合所有 tactical 條件」的寶可夢
    if (hasTactical && !hasDirectMoves && !hasGroupFilter && learnsetIndex) {
      result = result.filter((p) => {
        const showdownId = toShowdownId(p.name);
        const mapped =
          speciesLearnsetMap.get(showdownId) ??
          speciesLearnsetMap.get(resolveLearnsetId(p.name, speciesMapKeys));
        const speciesId = mapped ?? resolveLearnsetId(p.name, learnsetIndex.bySpecies);

        // 展開進化鏈（與 moveTagFilter 路徑邏輯一致）
        const chain: string[] = [speciesId];
        const visited = new Set<string>([speciesId]);
        let cur = speciesId;
        while (true) {
          const sp = showdownSpecies[cur];
          if (!sp?.prevo) break;
          const prevoId = toShowdownId(sp.prevo);
          if (visited.has(prevoId)) break;
          visited.add(prevoId);
          chain.push(prevoId);
          cur = prevoId;
        }

        const learnableMoveIds = new Set<string>();
        for (const id of chain) {
          const sp = showdownSpecies[id];
          const lookupId = learnsetIndex.bySpecies.has(id) ? id : (sp?.learnsetId ?? id);
          learnsetIndex.bySpecies.get(lookupId)?.forEach((m) => learnableMoveIds.add(m));
        }

        return [...learnableMoveIds].some((moveId) => applyTacticalMove(moveId));
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
  }, [allPokemon, filterState, sortConfig, learnsetIndex, speciesLearnsetMap, showdownSpecies, moves]); // filterState includes moveGroupFilter, abilityGroupFilter
}
