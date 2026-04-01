/**
 * SV 實務可學招式覆寫層（SV Practical Move Override Layer）
 *
 * ──────────────────────────────────────────────────────────────
 * 用途
 * ──────────────────────────────────────────────────────────────
 * 補充 Showdown learnset.json 未涵蓋的第九世代實務可學招式。
 * Showdown 資料以「傳統學習管道」為準（升級技、招式學習器、蛋招式、
 * 教導技），不包含 Gen 9 新增的「模仿香草（Mirror Herb）複製」機制。
 *
 * 本層與 Showdown 原始 learnset、custom move groups 完全分離，
 * 查詢時三者合併為一個 learnable set，不互相污染。
 *
 * ──────────────────────────────────────────────────────────────
 * 限制
 * ──────────────────────────────────────────────────────────────
 * 1. 此層為手動維護，不會隨 Showdown 資料自動更新。
 * 2. 目前只支援「該物種本身可學」的 override；
 *    進化後的種族透過進化鏈繼承機制（prevo chain）取得，不需重複填寫。
 *    例：meowthalola 有 override，persianalola 透過繼承自動取得。
 * 3. 目前未區分規則集（Regulation）或世代；
 *    若未來需要過濾，可將 value 改為
 *    `{ moves: string[]; minGen?: number; regulations?: string[] }`。
 *
 * ──────────────────────────────────────────────────────────────
 * 維護流程
 * ──────────────────────────────────────────────────────────────
 * 1. key   → toShowdownId() 後的種族 ID（全小寫，只保留 [a-z0-9]）
 * 2. value → Showdown move ID 陣列（全小寫，只保留 [a-z0-9]）
 * 3. 每條記錄加上行內註解，說明：
 *    - 寶可夢中文名 / 英文名
 *    - 來源機制（Mirror Herb / 特殊活動 / 其他）
 *    - 確認來源（如 VGC 賽事規則、官方公告或社群驗證）
 */
export const SPECIES_MOVE_OVERRIDES: Record<string, readonly string[]> = {
  // ── 朱紫面具三使（The Loyal Three）─────────────────────────
  //
  // 注意：munkidori（怒鸚哥，#1016）已在 Showdown learnset 中以 9L72 收錄，
  //       不需要 override。
  //
  // okidogi 與 fezandipiti 的 partingshot 不在 Showdown learnset，
  // 但 Gen 9 實務上可透過模仿香草（Mirror Herb）從隊友複製取得。

  // 滋汁鼴（Okidogi，#1015）
  // Showdown ID : okidogi
  // 來源        : Gen 9 模仿香草 — 與 Incineroar / partingshot 使用者同隊後習得
  // 驗證        : Showdown learnsets.json 確認 partingshot 不在其 learnset
  okidogi: ["partingshot"],

  // 噗隆隆（Fezandipiti，#1017）
  // Showdown ID : fezandipiti
  // 來源        : Gen 9 模仿香草 — 與 Incineroar / partingshot 使用者同隊後習得
  // 驗證        : Showdown learnsets.json 確認 partingshot 不在其 learnset
  fezandipiti: ["partingshot"],
};

/**
 * 取得指定種族的覆寫招式清單
 *
 * @param speciesId Showdown species ID（全小寫，只保留 [a-z0-9]）
 * @returns 該種族的覆寫招式 ID 陣列（若無則回傳空陣列）
 */
export function getOverrideMoves(speciesId: string): readonly string[] {
  return SPECIES_MOVE_OVERRIDES[speciesId] ?? [];
}
