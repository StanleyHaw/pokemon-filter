// ============================================================
// Raw Showdown move types (pokeapi → showdown 過渡期共存用)
// 符合 smogon/pokemon-showdown data/moves.ts 結構
// ============================================================

export type ShowdownMoveCategory = "Physical" | "Special" | "Status";

export type ShowdownMoveTarget =
  | "normal"
  | "self"
  | "allySide"
  | "foeSide"
  | "allAdjacentFoes"
  | "allAdjacent"
  | "any"
  | "adjacentAlly"
  | "adjacentFoeSide"
  | "all"
  | "allyTeam"
  | "scripted"
  | "randomNormal"
  | string;

/** 招式對 stat 的影響（正數=提升，負數=下降） */
export interface ShowdownBoosts {
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
  accuracy?: number;
  evasion?: number;
}

/** Showdown 招式的附加效果 */
export interface ShowdownSecondary {
  chance?: number;
  status?: string;
  volatileStatus?: string;
  boosts?: ShowdownBoosts;
  self?: {
    boosts?: ShowdownBoosts;
    volatileStatus?: string;
  };
}

/**
 * Showdown flags 物件，有值時為 1
 * 完整 key 清單參見 flagDictionary.ts
 */
export type ShowdownFlags = Partial<Record<string, 1>>;

/** 從 Showdown moves.json 讀取的原始招式資料 */
export interface ShowdownMoveRaw {
  num: number;
  name: string;
  type: string;
  category: ShowdownMoveCategory;
  basePower: number;
  /** true 表示必定命中（如御風、火旋等） */
  accuracy: number | true;
  pp: number;
  target: ShowdownMoveTarget;
  flags: ShowdownFlags;
  priority?: number;
  /** 單一附加效果 */
  secondary?: ShowdownSecondary | null;
  /** 多個附加效果（較少見） */
  secondaries?: ShowdownSecondary[];
  /** 吸血比例 [分子, 分母]，e.g. [1,2] = 50% */
  drain?: [number, number];
  /** 反動比例 [分子, 分母]，e.g. [1,3] = 33% */
  recoil?: [number, number];
  /** 連續攻擊次數：固定次數或 [min, max] */
  multihit?: number | [number, number];
  /** 直接對目標造成的 stat 變化（不走附加效果機制） */
  boosts?: ShowdownBoosts;
  /** 使用者自身效果 */
  self?: {
    boosts?: ShowdownBoosts;
    volatileStatus?: string;
  };
  selfBoost?: { boosts?: ShowdownBoosts };
  /** 直接造成的主要異常狀態 */
  status?: string;
  /** 直接造成的揮發狀態（混亂/怯步等） */
  volatileStatus?: string;
  /** 回復 HP 比例 [分子, 分母] */
  heal?: [number, number];
  /** "Past" | "Future" | "CAP" — 非標準格式 */
  isNonstandard?: string;
  /** 此招式為某 Z 招式的基底招式 ID */
  isZ?: string;
  /** 此招式為某 Max 招式的基底招式 ID */
  isMax?: string;
  zMove?: { basePower?: number; effect?: string; boosts?: ShowdownBoosts };
  maxMove?: { basePower?: number };
}

/** Showdown moves.json 的頂層結構 */
export type ShowdownMovesData = Record<string, ShowdownMoveRaw>;

// ============================================================
// Normalized move schema — UI 篩選器直接使用的結構
// ============================================================

export type MoveCategory = "physical" | "special" | "status";

/** 招式可影響的 stat key（Showdown 命名規則） */
export type BattleStatKey =
  | "atk"
  | "def"
  | "spa"
  | "spd"
  | "spe"
  | "accuracy"
  | "evasion";

export type StatBoostMap = Partial<Record<BattleStatKey, number>>;

/**
 * 招式標籤 — 全部從 flags 或計算得出
 * 可直接用於 UI 篩選條件
 */
export interface MoveTags {
  // ── 接觸 / 特性互動 ──────────────────────────────────────
  /** 接觸技（觸發靜電/火焰之軀等接觸特性） */
  isContactMove: boolean;
  /** 聲音技（穿透替身，防音特性免疫） */
  isSoundMove: boolean;
  /** 拳招（鐵拳特性 1.2x） */
  isPunchMove: boolean;
  /** 咬招（大顎特性 1.5x） */
  isBiteMove: boolean;
  /** 斬擊招式（鋒銳特性 1.5x） */
  isSlicingMove: boolean;
  /** 彈丸招式（防彈特性免疫） */
  isBulletMove: boolean;
  /** 波動招式（超古代特性 1.5x） */
  isPulseMove: boolean;
  /** 舞蹈招式（舞踏特性可複製） */
  isDanceMove: boolean;
  /** 風招式（乘風特性免疫/提升） */
  isWindMove: boolean;
  /** 粉末招式（防塵特性/草系免疫） */
  isPowderMove: boolean;

  // ── 對戰互動 ─────────────────────────────────────────────
  /** 可被守護/偵測擋住 */
  isProtectable: boolean;
  /** 可被魔法反射/魔法鏡反彈 */
  isReflectable: boolean;
  /** 穿透替身 */
  isBypassSubstitute: boolean;
  /** 可被鏡面複製 */
  isMirrorMove: boolean;
  /** 回復技（受療癒封鎖影響） */
  isHealingMove: boolean;

  // ── 先制/後制 ─────────────────────────────────────────────
  /** 先制技（priority > 0） */
  isHighPriority: boolean;
  /** 後制技（priority < 0） */
  isLowPriority: boolean;

  // ── 計算得出的效果標籤 ────────────────────────────────────
  /** 多段技 */
  isMultiHit: boolean;
  /** 有反動傷害 */
  hasRecoil: boolean;
  /** 吸血技 */
  hasDrain: boolean;
  /** 有附加效果（含機率觸發） */
  hasSecondaryEffect: boolean;
  /** 造成主要異常狀態（燒傷/麻痺等） */
  inflictsStatus: boolean;
  /** 造成揮發狀態（混亂/怯步等） */
  inflictsVolatileStatus: boolean;
  /** 對目標造成能力變化 */
  hasStatBoost: boolean;
  /** 對使用者自身造成能力變化 */
  hasSelfBoost: boolean;
}

/** 招式效果摘要 */
export interface MoveEffects {
  /** 造成的主要異常狀態代碼（brn/par/psn/tox/frz/slp） */
  status?: string;
  /** 造成的揮發狀態（confusion/flinch/...） */
  volatileStatus?: string;
  /** 對目標的 stat 增減 */
  statBoosts?: StatBoostMap;
  /** 對使用者自身的 stat 增減 */
  selfBoosts?: StatBoostMap;
  /** 吸血比例 0–1（如 0.5 = 吸收 50% 造成的傷害） */
  drain?: number;
  /** 反動比例 0–1（如 0.33 = 承受傷害的 33%） */
  recoil?: number;
  /** 回復使用者最大 HP 的比例 0–1 */
  heal?: number;
  /** 連續攻擊次數（固定值或 [min, max]） */
  multihit?: number | [number, number];
  /** 附加效果觸發機率 0–100 */
  secondaryChance?: number;
}

/** 正規化後的招式 — 儲存於 app 狀態 / IndexedDB 的格式 */
export interface NormalizedMove {
  // ── 識別 ──────────────────────────────────────────────────
  /** Showdown 內部 ID（小寫無空格），e.g. "thunderbolt" */
  id: string;
  /** 全國招式編號 */
  num: number;
  /** 英文顯示名稱 */
  name: string;
  /** 繁體中文名稱（從 moveNamesCn.ts 對應或另行填入） */
  nameTw: string;

  // ── 分類 ──────────────────────────────────────────────────
  type: string;
  category: MoveCategory;

  // ── 數值 ──────────────────────────────────────────────────
  basePower: number;
  /** null 表示必定命中 */
  accuracy: number | null;
  pp: number;
  priority: number;

  // ── 目標 ──────────────────────────────────────────────────
  target: string;

  // ── UI 篩選標籤 ───────────────────────────────────────────
  tags: MoveTags;

  // ── 效果摘要 ──────────────────────────────────────────────
  effects: MoveEffects;

  // ── 合法性 ────────────────────────────────────────────────
  /** 非現行世代標準招式（"Past" / "Future" / "CAP"） */
  isNonstandard?: string;
  isZMove: boolean;
  isMaxMove: boolean;

  // ── 原始備份（debug / 未來擴充用） ────────────────────────
  _raw?: ShowdownMoveRaw;
}
