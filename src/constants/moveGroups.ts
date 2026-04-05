/**
 * 專案自訂招式群組定義
 *
 * 用途：定義具有「戰術語意」的招式集合，供篩選器使用。
 *
 * 兩種群組類型：
 *   - 靜態群組：moveIds 為手動維護的 Showdown ID 列表
 *   - tag-backed 群組：moveIds 為空，tag 欄位指向 NormalizedMove.tags 的 key，
 *     過濾時由 useFilteredPokemon 從 Showdown moves 資料動態解析 moveId 集合
 *
 * 所有 moveIds 使用 Showdown ID 格式（全小寫，只保留 [a-z0-9]）。
 * 新增群組：
 *   1. 在 MoveGroupId union 加入新 key
 *   2. 在 MOVE_GROUPS 加入對應的定義
 */

import type { MoveTags } from "../types/move";

export type MoveGroupId =
  | "pivotMoves"
  | "priorityMoves"
  | "recoveryMoves"
  | "hazardRemovalMoves"
  | "setupMoves"
  | "weatherSetters"
  | "terrainSetters"
  | "trappingMoves"
  | "statusMoves"
  | "contactMoves"
  | "soundMoves"
  | "punchMoves"
  | "biteMoves"
  | "slicingMoves";

export interface MoveGroupDef {
  id: MoveGroupId;
  /** UI 顯示標籤（繁體中文） */
  label: string;
  /** 工具提示說明 */
  description: string;
  /**
   * Showdown move ID 列表（靜態群組使用）
   * tag-backed 群組此欄位為空陣列，實際 moveId 集合由 tag 動態解析
   */
  moveIds: readonly string[];
  /**
   * tag-backed 群組專用：對應 NormalizedMove.tags 的 key
   * 若設定此欄位，過濾時改從 moves 資料動態建立 moveId 集合
   */
  tag?: keyof MoveTags;
}

export const MOVE_GROUPS: Record<MoveGroupId, MoveGroupDef> = {
  pivotMoves: {
    id: "pivotMoves",
    label: "折返技",
    description: "使用後可換出自身的招式",
    moveIds: [
      "uturn",
      "voltswitch",
      "partingshot",
      "flipturn",
      "chillyreception",
      "teleport",
    ],
  },

  priorityMoves: {
    id: "priorityMoves",
    label: "先制技",
    description: "priority > 0 的攻擊招式（常見競技先制技精選）",
    moveIds: [
      "quickattack",
      "aquajet",
      "bulletpunch",
      "iceshard",
      "shadowsneak",
      "extremespeed",
      "fakeout",
      "firstimpression",
      "vacuumwave",
      "grassyglide",
      "jetpunch",
    ],
  },

  recoveryMoves: {
    id: "recoveryMoves",
    label: "回復技",
    description: "能恢復自身 HP 的招式（含間接回復）",
    moveIds: [
      "recover",
      "softboiled",
      "roost",
      "slackoff",
      "moonlight",
      "morningsun",
      "synthesis",
      "wish",
      "healorder",
      "milkdrink",
      "shoreup",
      "leechseed",
      "drainpunch",
      "gigadrain",
      "hornleech",
      "oblivionwing",
      "strengthsap",
    ],
  },

  hazardRemovalMoves: {
    id: "hazardRemovalMoves",
    label: "清場技",
    description: "可移除場地障礙物（撒菱/隱形岩等）的招式",
    moveIds: [
      "rapidspin",
      "defog",
      "courtchange",
      "mortalspin",
    ],
  },

  setupMoves: {
    id: "setupMoves",
    label: "強化技",
    description: "提升自身能力階段的設置招式",
    moveIds: [
      "swordsdance",
      "nastyplot",
      "calmmind",
      "dragondance",
      "quiverdance",
      "shellsmash",
      "irondefense",
      "coil",
      "bulkup",
      "workup",
      "victorydance",
      "tidyup",
      "growth",
      "agility",
      "rockpolish",
      "tailglow",
      "geomancy",
      "clangoroussoul",
      "filletaway",
    ],
  },

  weatherSetters: {
    id: "weatherSetters",
    label: "天氣技",
    description: "設置天氣效果的招式",
    moveIds: [
      "sunnyday",
      "raindance",
      "sandstorm",
      "snowscape",
      "hail",
    ],
  },

  terrainSetters: {
    id: "terrainSetters",
    label: "場地技",
    description: "設置地形效果的招式",
    moveIds: [
      "electricterrain",
      "grassyterrain",
      "mistyterrain",
      "psychicterrain",
    ],
  },

  trappingMoves: {
    id: "trappingMoves",
    label: "封鎖技",
    description: "阻止對方換出的招式",
    moveIds: [
      "meanlook",
      "block",
      "spiderweb",
      "thousandwaves",
      "spiritshackle",
      "shadowhold",
    ],
  },

  statusMoves: {
    id: "statusMoves",
    label: "控制技",
    description: "對對手造成異常狀態或強制限制的招式",
    moveIds: [
      "thunderwave",
      "willowisp",
      "toxicspikes",
      "toxic",
      "encore",
      "taunt",
      "disable",
      "torment",
      "yawn",
      "nuzzle",
      "glare",
      "stunspore",
      "sleeppowder",
      "spore",
    ],
  },

  // ── tag-backed 群組：moveIds 為空，由 Showdown moves.tags 動態解析 ──────

  contactMoves: {
    id: "contactMoves",
    label: "接觸技",
    description: "使用時觸碰對方的招式（會被粗糙皮膚等特性影響）",
    moveIds: [],
    tag: "isContactMove",
  },

  soundMoves: {
    id: "soundMoves",
    label: "聲音技",
    description: "聲音系招式（會被隔音特性無效）",
    moveIds: [],
    tag: "isSoundMove",
  },

  punchMoves: {
    id: "punchMoves",
    label: "拳技",
    description: "拳系招式（會被強拳特性強化）",
    moveIds: [],
    tag: "isPunchMove",
  },

  biteMoves: {
    id: "biteMoves",
    label: "咬技",
    description: "咬合系招式（會被強顎特性強化）",
    moveIds: [],
    tag: "isBiteMove",
  },

  slicingMoves: {
    id: "slicingMoves",
    label: "斬擊技",
    description: "斬擊系招式（會被鋒利特性強化）",
    moveIds: [],
    tag: "isSlicingMove",
  },
};

// ── 便利查詢函式 ─────────────────────────────────────────────

export function getMoveGroupIds(): MoveGroupId[] {
  return Object.keys(MOVE_GROUPS) as MoveGroupId[];
}

/**
 * 判斷某招式（Showdown ID）是否屬於指定群組。
 *
 * ⚠️ 僅適用於靜態 moveIds 群組（pivotMoves、setupMoves 等）。
 * tag-backed 群組（contactMoves、soundMoves、punchMoves、biteMoves、slicingMoves）
 * 的 moveIds 為空陣列，此函式永遠回傳 false。
 * tag-backed 群組需透過 NormalizedMove.tags[groupDef.tag] 動態判斷。
 */
export function moveInGroup(moveId: string, groupId: MoveGroupId): boolean {
  return (MOVE_GROUPS[groupId].moveIds as string[]).includes(moveId);
}

/**
 * 取得招式（Showdown ID）所屬的所有靜態群組。
 *
 * ⚠️ 僅回傳靜態 moveIds 群組的結果，不包含 tag-backed 群組
 * （contactMoves、soundMoves、punchMoves、biteMoves、slicingMoves）。
 * 若需要完整群組歸屬（含 tag-backed），須另行查詢 NormalizedMove.tags。
 */
export function getGroupsForMove(moveId: string): MoveGroupId[] {
  return getMoveGroupIds().filter((gid) => moveInGroup(moveId, gid));
}
