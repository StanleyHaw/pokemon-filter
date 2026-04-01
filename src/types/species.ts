// ============================================================
// Raw Showdown species types (符合 data/pokedex.ts 結構)
// ============================================================

export interface ShowdownBaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/** Showdown pokedex.json 中的特性欄位 */
export interface ShowdownAbilitySlots {
  "0": string;    // 特性 1
  "1"?: string;   // 特性 2
  H?: string;     // 隱藏特性
  S?: string;     // 特殊（活動限定）
}

/** 從 Showdown pokedex.json 讀取的原始寶可夢資料 */
export interface ShowdownSpeciesRaw {
  num: number;
  name: string;
  types: [string] | [string, string];
  genderRatio?: { M: number; F: number };
  gender?: "M" | "F" | "N";
  baseStats: ShowdownBaseStats;
  abilities: ShowdownAbilitySlots;
  heightm: number;
  weightkg: number;
  color: string;
  evos?: string[];          // 進化後的 Showdown ID 列表
  prevo?: string;           // 進化前的 Showdown ID
  evoLevel?: number;
  evoCondition?: string;
  evoItem?: string;
  evoMove?: string;
  eggGroups: string[];
  tier?: string;            // e.g. "OU" | "UU" | "NU" | "Uber" | "LC" | "NFE"
  doublesTier?: string;
  isNonstandard?: string;   // "Past" | "CAP" | "LGPE Only" 等
  baseSpecies?: string;     // 若為變化形態，指向基底種族
  forme?: string;           // 形態名稱，e.g. "Mega" | "Alola" | "Galar"
  formeOrder?: string[];
  cosmeticFormes?: string[];
  otherFormes?: string[];
  changesFrom?: string;     // 戰鬥結束後恢復的形態
}

/** Showdown pokedex.json 頂層結構 */
export type ShowdownPokedexData = Record<string, ShowdownSpeciesRaw>;

// ============================================================
// Normalized species schema — UI 篩選器直接使用的結構
// ============================================================

/** 三個特性欄位 */
export interface NormalizedAbilities {
  slot1: string;
  slot2?: string;
  hidden?: string;
}

/** 種族值 + 計算得出的 BST */
export interface NormalizedBaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  /** 合計種族值（Base Stat Total） */
  bst: number;
}

/** 正規化後的寶可夢種族資料 */
export interface NormalizedSpecies {
  // ── 識別 ──────────────────────────────────────────────────
  /** Showdown 內部 ID，e.g. "bulbasaur" | "charizardmegax" */
  id: string;
  /** 全國圖鑑編號 */
  num: number;
  /** 英文顯示名稱 */
  name: string;
  /**
   * 繁體中文名稱
   * 優先從 pokemon_list.json 對應；若無則留空字串
   */
  nameTw: string;

  // ── 對戰核心 ──────────────────────────────────────────────
  types: [string] | [string, string];
  abilities: NormalizedAbilities;
  stats: NormalizedBaseStats;

  // ── 競技分層 ──────────────────────────────────────────────
  /** 單打 tier，e.g. "OU" | "UU" | "Uber" | "LC" | "NFE" | "Untiered" */
  tier?: string;
  /** 雙打 tier */
  doublesTier?: string;

  // ── 形態 / 進化 ───────────────────────────────────────────
  /** 是否為變化形態（mega / 地區形態 / 其他） */
  isAltForm: boolean;
  /** 若為變化形態，基底種族的 Showdown ID */
  baseSpecies?: string;
  /** 形態名稱（e.g. "Mega" | "Alola"） */
  forme?: string;
  /** 進化前的 Showdown ID */
  prevo?: string;
  /** 進化後的 Showdown ID 列表 */
  evos?: string[];

  // ── Learnset 對應 ─────────────────────────────────────────
  /**
   * 查找 learnset 時使用的 ID
   * 通常等於 id，但部分變化形態與基底共用 learnset
   * e.g. charizardmegax → "charizard"
   */
  learnsetId: string;

  // ── 合法性 ────────────────────────────────────────────────
  isNonstandard?: string;

  // ── 原始備份 ──────────────────────────────────────────────
  _raw?: ShowdownSpeciesRaw;
}
