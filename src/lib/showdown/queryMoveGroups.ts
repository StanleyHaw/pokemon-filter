/**
 * 自訂招式群組查詢 helper
 *
 * 依賴：
 *   - LearnsetIndex（含進化鏈繼承的 bySpecies Map）
 *   - speciesRecord（用於追溯 prevo chain）
 *   - MOVE_GROUPS 定義
 *
 * 核心函式：getMatchedMovesByConditions
 */

import type { LearnsetIndex } from "../../types/learnset";
import { MOVE_GROUPS, type MoveGroupId } from "../../constants/moveGroups";
import { getOverrideMoves } from "../../constants/moveOverrides";
import { toShowdownId } from "./showdownId";

/** getPrevoChain 所需的最小種族介面（與 normalizeLearnset 共用） */
interface SpeciesForChain {
  prevo?: string;
  learnsetId: string;
}

// ── 進化鏈展開（複製 normalizeLearnset 的邏輯，避免循環 import） ──────────

function buildChain(
  speciesId: string,
  speciesRecord: Record<string, SpeciesForChain>
): string[] {
  const chain: string[] = [speciesId];
  const visited = new Set<string>([speciesId]);
  let current = speciesId;

  while (true) {
    const sp = speciesRecord[current];
    if (!sp?.prevo) break;
    const prevoId = toShowdownId(sp.prevo);
    if (visited.has(prevoId)) break;
    visited.add(prevoId);
    chain.push(prevoId);
    current = prevoId;
  }

  return chain;
}

/** 取得寶可夢整條進化鏈的所有可學招式 Set（含 learnsetId 解析） */
function getLearnableSet(
  speciesId: string,
  index: LearnsetIndex,
  speciesRecord: Record<string, SpeciesForChain>
): Set<string> {
  const chain = buildChain(speciesId, speciesRecord);
  const learned = new Set<string>();

  for (const id of chain) {
    const sp = speciesRecord[id];
    // 若 learnset index 中有此 form 的獨立記錄，優先使用自身 ID（與 canLearnAllMovesInChain 邏輯一致）
    const lookupId = index.bySpecies.has(id) ? id : (sp?.learnsetId ?? id);
    index.bySpecies.get(lookupId)?.forEach((m) => learned.add(m));
    // override layer：納入模仿香草等特殊機制可學的招式
    getOverrideMoves(id).forEach((m) => learned.add(m));
  }

  return learned;
}

// ── 主要查詢型別 ─────────────────────────────────────────────

export interface MoveGroupConditions {
  /**
   * 每個群組必須至少命中一個招式（群組間是 AND）
   * 例如 ["pivotMoves", "setupMoves"] → 必須同時有折返技和強化技
   */
  anyOfGroups?: MoveGroupId[];

  /**
   * 必須能學會所有列出的單招（直接 Showdown ID 或 PokéAPI slug）
   * 例如 ["fakeout", "uturn"]
   */
  allOfMoves?: string[];

  /**
   * 各群組的候選招式 pre-filtered 結果
   *
   * 若有提供，對應 groupId 改用此 list 而非 MOVE_GROUPS[id].moveIds。
   * 未提供某 groupId 時退回 MOVE_GROUPS[id].moveIds（向下相容）。
   *
   * 使用場景：useFilteredPokemon 將 tacticalMoveFilters + moveTagFilter
   * 預先收斂各群組招式後，透過此欄位傳入，避免在查詢函式內重複存取 moves 資料。
   */
  refinedGroupMoves?: Partial<Record<MoveGroupId, string[]>>;
}

export interface MoveGroupMatchResult {
  matched: boolean;
  /** 每個群組實際命中的招式 ID 列表 */
  matchedGroupMoves: Partial<Record<MoveGroupId, string[]>>;
  /** 直接指定招式中實際命中的招式 ID 列表 */
  matchedDirectMoves: string[];
}

// ── 主要查詢函式 ──────────────────────────────────────────────

/**
 * 判斷某種族是否同時滿足群組條件與直接招式條件
 *
 * @param speciesId     目標種族 Showdown ID（已解析 learnsetId）
 * @param conditions    查詢條件
 * @param index         LearnsetIndex
 * @param speciesRecord 完整種族資料表（用於追溯 prevo chain）
 *
 * @example
 * getMatchedMovesByConditions("incineroar", {
 *   anyOfGroups: ["pivotMoves"],
 *   allOfMoves: ["fakeout"],
 * }, index, species)
 * // → { matched: true, matchedGroupMoves: { pivotMoves: ["partingshot"] }, matchedDirectMoves: ["fakeout"] }
 */
export function getMatchedMovesByConditions(
  speciesId: string,
  conditions: MoveGroupConditions,
  index: LearnsetIndex,
  speciesRecord: Record<string, SpeciesForChain>
): MoveGroupMatchResult {
  const result: MoveGroupMatchResult = {
    matched: false,
    matchedGroupMoves: {},
    matchedDirectMoves: [],
  };

  const { anyOfGroups = [], allOfMoves = [], refinedGroupMoves } = conditions;
  if (anyOfGroups.length === 0 && allOfMoves.length === 0) {
    result.matched = true;
    return result;
  }

  const learnable = getLearnableSet(speciesId, index, speciesRecord);

  // ── 群組條件：每個 group 至少命中一個 ────────────────────────
  for (const groupId of anyOfGroups) {
    // 使用 pre-filtered 候選列表（若有），否則退回原始定義
    const groupMoveIds = (refinedGroupMoves?.[groupId] ?? MOVE_GROUPS[groupId].moveIds) as string[];
    const hits = groupMoveIds.filter((m) => learnable.has(m));
    if (hits.length === 0) return result; // 該 group 無命中 → 整體不滿足
    result.matchedGroupMoves[groupId] = hits;
  }

  // ── 直接招式條件：每個招式都必須能學 ───────────────────────
  for (const rawMoveId of allOfMoves) {
    const moveId = toShowdownId(rawMoveId);
    if (!learnable.has(moveId)) return result; // 缺少任一 → 不滿足
    result.matchedDirectMoves.push(moveId);
  }

  result.matched = true;
  return result;
}

// ── 批次查詢 ──────────────────────────────────────────────────

/**
 * 從一批種族 ID 中，篩選出滿足條件的種族，並回傳各自的命中結果
 */
export function filterSpeciesByMoveGroupConditions(
  speciesIds: string[],
  conditions: MoveGroupConditions,
  index: LearnsetIndex,
  speciesRecord: Record<string, SpeciesForChain>
): { speciesId: string; result: MoveGroupMatchResult }[] {
  return speciesIds
    .map((id) => ({
      speciesId: id,
      result: getMatchedMovesByConditions(id, conditions, index, speciesRecord),
    }))
    .filter(({ result }) => result.matched);
}

/**
 * 判斷某種族是否滿足條件（只要 boolean，不需要命中明細）
 */
export function canSatisfyMoveGroupConditions(
  speciesId: string,
  conditions: MoveGroupConditions,
  index: LearnsetIndex,
  speciesRecord: Record<string, SpeciesForChain>
): boolean {
  return getMatchedMovesByConditions(speciesId, conditions, index, speciesRecord).matched;
}
