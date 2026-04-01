/**
 * 專案自訂招式群組定義
 *
 * 用途：定義具有「戰術語意」的招式集合，供篩選器使用。
 * 這些群組無法從 Showdown 原生 flags 推導，需手動維護。
 *
 * 所有 moveIds 使用 Showdown ID 格式（全小寫，只保留 [a-z0-9]）。
 * 新增群組：
 *   1. 在 MoveGroupId union 加入新 key
 *   2. 在 MOVE_GROUPS 加入對應的定義
 */

export type MoveGroupId =
  | "pivotMoves"
  | "priorityMoves"
  | "recoveryMoves"
  | "hazardRemovalMoves"
  | "setupMoves"
  | "weatherSetters"
  | "terrainSetters"
  | "trappingMoves"
  | "statusMoves";

export interface MoveGroupDef {
  id: MoveGroupId;
  /** UI 顯示標籤（繁體中文） */
  label: string;
  /** 工具提示說明 */
  description: string;
  /** Showdown move ID 列表 */
  moveIds: readonly string[];
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
};

// ── 便利查詢函式 ─────────────────────────────────────────────

export function getMoveGroupIds(): MoveGroupId[] {
  return Object.keys(MOVE_GROUPS) as MoveGroupId[];
}

/** 判斷某招式（Showdown ID）是否屬於指定群組 */
export function moveInGroup(moveId: string, groupId: MoveGroupId): boolean {
  return (MOVE_GROUPS[groupId].moveIds as string[]).includes(moveId);
}

/** 取得招式（Showdown ID）所屬的所有群組 */
export function getGroupsForMove(moveId: string): MoveGroupId[] {
  return getMoveGroupIds().filter((gid) => moveInGroup(moveId, gid));
}
