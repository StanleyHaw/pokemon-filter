import type {
  ShowdownLearnsetsData,
  LearnEntry,
  LearnMethodCode,
  SpeciesLearnset,
  LearnsetIndex,
} from "../../types/learnset";
import { toShowdownId } from "./showdownId";
import { getOverrideMoves } from "../../constants/moveOverrides";

// ── 解析函式 ─────────────────────────────────────────────────

/**
 * 解析 Showdown learnset 的編碼字串
 *
 * 格式：`{gen}{method}{level?}`
 * 範例：
 *   "9L30"  → { gen: 9, method: "L", level: 30 }
 *   "9M"    → { gen: 9, method: "M" }
 *   "9E"    → { gen: 9, method: "E" }
 *   "9S0"   → { gen: 9, method: "S" }
 *   "8T"    → { gen: 8, method: "T" }
 */
export function parseLearnEntry(encoded: string): LearnEntry | null {
  // 第一個字元為世代數字（1-9）
  const gen = parseInt(encoded[0], 10);
  if (isNaN(gen)) return null;

  const method = encoded[1] as LearnMethodCode;
  if (!method) return null;

  const entry: LearnEntry = { gen, method };

  // 升級技才有等級數字
  if (method === "L") {
    const level = parseInt(encoded.slice(2), 10);
    if (!isNaN(level)) entry.level = level;
  }

  return entry;
}

/**
 * 將單一種族的 Showdown learnset 資料轉換為 SpeciesLearnset
 *
 * @param speciesId  種族 ID（小寫）
 * @param rawLearnset  learnsets.json 中單個種族的 learnset 物件
 * @param minGen  最低世代篩選（e.g. 9 = 只保留第九世代的學習方式）
 */
export function normalizeSpeciesLearnset(
  speciesId: string,
  rawLearnset: Record<string, string[]>,
  minGen = 1
): SpeciesLearnset {
  const moves: Record<string, LearnEntry[]> = {};

  for (const [moveId, encodedList] of Object.entries(rawLearnset)) {
    const entries: LearnEntry[] = [];

    for (const encoded of encodedList) {
      const entry = parseLearnEntry(encoded);
      if (entry && entry.gen >= minGen) {
        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      moves[moveId] = entries;
    }
  }

  return { speciesId, moves };
}

// ── 索引建立 ─────────────────────────────────────────────────

/**
 * 從完整 learnsets.json 建立雙向查詢索引
 *
 * @param data    完整的 learnsets.json 資料
 * @param minGen  只納入此世代以上的學習方式（預設 1 = 全部世代）
 *
 * 建議值：
 *   - 競技篩選（目前可用）: minGen = 9
 *   - 歷代總覽: minGen = 1
 */
export function buildLearnsetIndex(
  data: ShowdownLearnsetsData,
  minGen = 1
): LearnsetIndex {
  const bySpecies = new Map<string, Set<string>>();
  const byMove = new Map<string, Set<string>>();
  const bySpeciesDetailed = new Map<string, Map<string, LearnEntry[]>>();

  for (const [speciesId, entry] of Object.entries(data)) {
    if (!entry.learnset) continue;

    const learnset = normalizeSpeciesLearnset(speciesId, entry.learnset, minGen);
    const moveIds = new Set<string>();
    const detailedMap = new Map<string, LearnEntry[]>();

    for (const [moveId, entries] of Object.entries(learnset.moves)) {
      moveIds.add(moveId);
      detailedMap.set(moveId, entries);

      // 反向索引
      if (!byMove.has(moveId)) byMove.set(moveId, new Set());
      byMove.get(moveId)!.add(speciesId);
    }

    bySpecies.set(speciesId, moveIds);
    bySpeciesDetailed.set(speciesId, detailedMap);
  }

  return { bySpecies, byMove, bySpeciesDetailed };
}

// ── 查詢函式 ─────────────────────────────────────────────────

/**
 * 判斷某種族是否能學某招式
 *
 * @param index      LearnsetIndex
 * @param speciesId  種族 Showdown ID
 * @param moveId     招式 Showdown ID
 */
export function canLearnMove(
  index: LearnsetIndex,
  speciesId: string,
  moveId: string
): boolean {
  return index.bySpecies.get(speciesId)?.has(moveId) ?? false;
}

/**
 * 判斷某種族是否能同時學會所有指定招式（交集）
 *
 * @param index      LearnsetIndex
 * @param speciesId  種族 Showdown ID
 * @param moveIds    招式 Showdown ID 列表
 */
export function canLearnAllMoves(
  index: LearnsetIndex,
  speciesId: string,
  moveIds: string[]
): boolean {
  if (moveIds.length === 0) return true;
  const learned = index.bySpecies.get(speciesId);
  if (!learned) return false;
  return moveIds.every((id) => learned.has(id));
}

/**
 * 判斷某種族是否能學會至少一個指定招式（聯集）
 */
export function canLearnAnyMove(
  index: LearnsetIndex,
  speciesId: string,
  moveIds: string[]
): boolean {
  if (moveIds.length === 0) return false;
  const learned = index.bySpecies.get(speciesId);
  if (!learned) return false;
  return moveIds.some((id) => learned.has(id));
}

/**
 * 從一批種族 ID 中，篩選出能學某招式的種族
 */
export function filterSpeciesCanLearn(
  index: LearnsetIndex,
  speciesIds: string[],
  moveId: string
): string[] {
  return speciesIds.filter((id) => canLearnMove(index, id, moveId));
}

/**
 * 從一批種族 ID 中，篩選出能同時學會所有指定招式的種族
 */
export function filterSpeciesCanLearnAll(
  index: LearnsetIndex,
  speciesIds: string[],
  moveIds: string[]
): string[] {
  if (moveIds.length === 0) return speciesIds;
  return speciesIds.filter((id) => canLearnAllMoves(index, id, moveIds));
}

// ── 進化鏈繼承查詢 ───────────────────────────────────────────

/** 最小化種族介面，只需要 prevo 與 learnsetId */
interface SpeciesForChain {
  prevo?: string;
  learnsetId: string;
}

/**
 * 從指定種族往回追溯，回傳所有前置進化的 Showdown ID 列表
 * 順序：直接前置 → 再前置 → ... → 基底種族
 *
 * @param speciesId    起點種族 ID（已為 Showdown ID 格式）
 * @param speciesRecord  完整種族資料表
 */
export function getPrevoChain(
  speciesId: string,
  speciesRecord: Record<string, SpeciesForChain>
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let current = speciesId;

  while (true) {
    const sp = speciesRecord[current];
    if (!sp?.prevo) break;

    const prevoId = toShowdownId(sp.prevo);
    if (visited.has(prevoId)) break; // 防止循環
    visited.add(prevoId);
    chain.push(prevoId);
    current = prevoId;
  }

  return chain;
}

/**
 * 判斷某種族是否能學某招式（含往前追溯前置進化）
 *
 * 規則：
 *  - 先查自身 learnset
 *  - 若無，往前追溯 prevo → prevo.prevo → ... 直到 base form
 *  - 蛋招式通常只記錄在最初階段，故進化型態需透過此函式才能匹配
 */
export function canLearnMoveInChain(
  index: LearnsetIndex,
  speciesId: string,
  moveId: string,
  speciesRecord: Record<string, SpeciesForChain>
): boolean {
  const chain = [speciesId, ...getPrevoChain(speciesId, speciesRecord)];

  return chain.some((id) => {
    const sp = speciesRecord[id];
    const lookupId = sp?.learnsetId ?? id;
    return (index.bySpecies.get(lookupId)?.has(moveId) ?? false) ||
           getOverrideMoves(id).includes(moveId);
  });
}

/**
 * 判斷某種族是否能同時學會所有指定招式（含進化鏈繼承，交集）
 *
 * 每個招式分別在整條進化鏈中尋找，只要鏈中任何一環能學即視為可學。
 *
 * @param index         LearnsetIndex
 * @param speciesId     種族 Showdown ID
 * @param moveIds       招式 Showdown ID 列表
 * @param speciesRecord 完整種族資料表（用於追溯 prevo）
 */
export function canLearnAllMovesInChain(
  index: LearnsetIndex,
  speciesId: string,
  moveIds: string[],
  speciesRecord: Record<string, SpeciesForChain>
): boolean {
  if (moveIds.length === 0) return true;

  const chain = [speciesId, ...getPrevoChain(speciesId, speciesRecord)];

  return moveIds.every((moveId) =>
    chain.some((id) => {
      const sp = speciesRecord[id];
      const lookupId = sp?.learnsetId ?? id;
      return (index.bySpecies.get(lookupId)?.has(moveId) ?? false) ||
             getOverrideMoves(id).includes(moveId);
    })
  );
}

/**
 * 回傳 UI 顯示用的「成立招式清單」
 *
 * 判定邏輯與 canLearnAllMovesInChain 完全一致：
 *   逐一檢查每個招式，在整條進化鏈中是否有任何一環可學。
 *   成立者回傳 { moveId, sourceSpeciesId }。
 *
 * @param index         LearnsetIndex
 * @param speciesId     目標種族 Showdown ID（已含 learnsetId 解析）
 * @param moveIds       篩選條件中的招式 Showdown ID 列表
 * @param speciesRecord 完整種族資料表（用於追溯 prevo）
 * @returns 每個成立招式及其來源種族 ID
 */
export function getDisplayableMatchedMoves(
  index: LearnsetIndex,
  speciesId: string,
  moveIds: string[],
  speciesRecord: Record<string, SpeciesForChain>
): { moveId: string; sourceSpeciesId: string }[] {
  const chain = [speciesId, ...getPrevoChain(speciesId, speciesRecord)];
  const result: { moveId: string; sourceSpeciesId: string }[] = [];

  for (const moveId of moveIds) {
    for (const id of chain) {
      const sp = speciesRecord[id];
      const lookupId = sp?.learnsetId ?? id;
      if ((index.bySpecies.get(lookupId)?.has(moveId)) || getOverrideMoves(id).includes(moveId)) {
        result.push({ moveId, sourceSpeciesId: id });
        break; // 找到第一個來源即可，不需繼續往上查
      }
    }
  }

  return result;
}

/**
 * 取得某種族能學某招式的所有學習方式（含世代與方法）
 * 若找不到則回傳空陣列
 */
export function getLearnMethods(
  index: LearnsetIndex,
  speciesId: string,
  moveId: string
): LearnEntry[] {
  return index.bySpeciesDetailed.get(speciesId)?.get(moveId) ?? [];
}
