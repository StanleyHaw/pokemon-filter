// ============================================================
// Learnset types — 招式學習方式與查詢索引
// ============================================================

/**
 * 招式學習方式代碼
 *
 * Showdown learnset 的編碼格式為 `{gen}{method}{level?}`
 * e.g. "9L30" = 第九世代升級 30 學會
 *      "9M"   = 第九世代 TM/HM
 *      "9E"   = 第九世代蛋招
 */
export type LearnMethodCode =
  | "L"   // 升級技（Level-up）
  | "M"   // TM / HM / TR
  | "T"   // 技能指導（Move Tutor）
  | "E"   // 蛋招（Egg Move）
  | "R"   // 喚起技（Move Reminder / Relearn）
  | "S"   // 活動/特殊分發（Event）
  | "D"   // Dream World / BDSP 下載遊伴
  | "V"   // Virtual Console 轉移（Gen 1-2）
  | "C";  // 自訂（CAP 等非標準）

/** 單筆學習來源記錄 */
export interface LearnEntry {
  gen: number;
  method: LearnMethodCode;
  /** 升級等級，僅 method === "L" 時有值 */
  level?: number;
}

/** Showdown learnsets.json 中單個種族的資料 */
export interface ShowdownLearnsetEntry {
  /** moveId → 編碼字串陣列，e.g. { "thunderbolt": ["9M", "8M"] } */
  learnset: Record<string, string[]>;
}

/** Showdown learnsets.json 的頂層結構 */
export type ShowdownLearnsetsData = Record<string, ShowdownLearnsetEntry>;

// ============================================================
// 正規化後的結構
// ============================================================

/** 單一種族的完整可學招式清單（已解析） */
export interface SpeciesLearnset {
  speciesId: string;
  /** moveId → 所有學習方式（跨世代） */
  moves: Record<string, LearnEntry[]>;
}

/**
 * 雙向查詢索引
 *
 * 設計目標：
 *   - 判斷某種族是否能學會某招式 → bySpecies
 *   - 判斷某種族是否能同時學會多個招式 → bySpecies（交集）
 *   - 找出哪些種族能學某招式 → byMove
 *   - 特定學習方式篩選 → bySpeciesDetailed
 */
export interface LearnsetIndex {
  /**
   * speciesId → 可學招式 ID 集合（Set）
   * 預設包含所有世代；可在建立索引時指定 minGen 限縮
   */
  bySpecies: Map<string, Set<string>>;

  /** moveId → 可學該招式的種族 ID 集合 */
  byMove: Map<string, Set<string>>;

  /**
   * 詳細學習資訊（需要時才查詢，避免記憶體浪費）
   * speciesId → (moveId → LearnEntry[])
   */
  bySpeciesDetailed: Map<string, Map<string, LearnEntry[]>>;
}
