/**
 * PokéAPI ↔ Showdown ID 轉換工具
 *
 * Showdown 內部 ID 規則：全小寫，只保留 [a-z0-9]，移除所有其他字元
 * 等同於 Showdown 原始碼的 toID(str)
 */

/**
 * 將任意字串轉為 Showdown 內部 ID
 * e.g. "aqua-jet"       → "aquajet"
 *      "Charizard-Mega-X" → "charizardmegax"
 *      "Mr. Mime"        → "mrmime"
 */
export function toShowdownId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * PokéAPI 特殊 form 名稱 → Showdown species ID 靜態映射表
 *
 * 當 toShowdownId(pokéAPIName) 產生的字串無法對應到 Showdown learnset 中任何已知 ID 時，
 * 先查此表做精確映射，再進行後綴剝離嘗試。
 *
 * 適用情境：PokéAPI 的 form 後綴（如 "-green-plumage"）無法被 FORM_SUFFIXES 正確剝離。
 * key   = toShowdownId(pokéAPI pokemon name)
 * value = 對應的 Showdown species ID（已存在於 learnset index）
 */
const POKEAPI_FORM_OVERRIDES: Record<string, string> = {
  // 怒鸚哥（Squawkabilly，#931）
  // PokéAPI 以顏色羽毛命名四個型態，Showdown learnset 只有單一 "squawkabilly" 條目
  // greenplumage = is_default=true（列表唯一顯示的 row）
  squawkabillygreenplumage: "squawkabilly",
  squawkabillyblueplumage:  "squawkabilly",
  squawkabillyyellowplumage: "squawkabilly",
  squawkabillywhiteplumage: "squawkabilly",
};

/**
 * 將 PokéAPI pokemon slug 對應到 Showdown learnset 的查詢 ID
 *
 * 多數情況下 toShowdownId(name) 即可，但部分變化形態（Mega / Primal / G-Max）
 * 在 Showdown learnset 中沒有獨立記錄，需退回基底種族。
 *
 * 策略：
 *  1. 先試 toShowdownId(name) 確認 index 中是否存在
 *  2. 查 POKEAPI_FORM_OVERRIDES 精確映射（處理 PokéAPI 特有後綴）
 *  3. 嘗試剝離已知形態後綴，退回基底種族
 *  4. 仍找不到則回傳原轉換結果（篩選時視為無法學習）
 */
export function resolveLearnsetId(
  pokemonName: string,
  bySpecies: Map<string, Set<string>>
): string {
  const exact = toShowdownId(pokemonName);
  if (bySpecies.has(exact)) return exact;

  // 精確映射：處理 FORM_SUFFIXES 無法剝離的 PokéAPI 特有後綴
  const formOverride = POKEAPI_FORM_OVERRIDES[exact];
  if (formOverride && bySpecies.has(formOverride)) return formOverride;

  // 常見形態後綴，由長到短排序避免短後綴誤截
  const FORM_SUFFIXES = [
    "megax", "megay", "mega",
    "primal",
    "gmax",
    "alolan", "alola",
    "galarian", "galar",
    "hisuian", "hisui",
    "paldean", "paldea",
    "origin", "therian", "black", "white", "resolute",
    "totem",
  ] as const;

  for (const suffix of FORM_SUFFIXES) {
    if (exact.endsWith(suffix)) {
      const base = exact.slice(0, exact.length - suffix.length);
      if (base.length > 0 && bySpecies.has(base)) return base;
    }
  }

  return exact;
}

/**
 * 從 NormalizedSpecies 批次建立 speciesId → learnsetId 的映射表
 * 供 useFilteredPokemon 快速查詢，避免每次逐一計算後綴
 */
export function buildSpeciesLearnsetMap(
  speciesRecord: Record<string, { learnsetId: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [id, species] of Object.entries(speciesRecord)) {
    map.set(id, species.learnsetId);
  }
  return map;
}
