import type {
  ShowdownSpeciesRaw,
  ShowdownPokedexData,
  NormalizedAbilities,
  NormalizedBaseStats,
  NormalizedSpecies,
} from "../../types/species";

// ── 輔助函式 ─────────────────────────────────────────────────

function computeBST(s: ShowdownSpeciesRaw["baseStats"]): number {
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}

function extractAbilities(raw: ShowdownSpeciesRaw): NormalizedAbilities {
  const abilities: NormalizedAbilities = {
    slot1: raw.abilities["0"],
  };
  if (raw.abilities["1"]) abilities.slot2 = raw.abilities["1"];
  if (raw.abilities["H"]) abilities.hidden = raw.abilities["H"];
  return abilities;
}

/**
 * 判斷此種族是否應對應到基底種族的 learnset
 *
 * 規則：
 *   - 若有 baseSpecies（=變化形態），通常共用基底的 learnset
 *   - 例外：部分地區形態（如 rattataalolatotem）有獨立 learnset
 *   - 此函式採取保守策略：優先使用 baseSpecies 的 ID
 */
function resolveLearnsetId(id: string, raw: ShowdownSpeciesRaw): string {
  if (!raw.baseSpecies) return id;
  // Showdown learnset key 為小寫無空格的種族名稱
  return raw.baseSpecies.toLowerCase().replace(/[\s-]/g, "");
}

// ── 主要轉換函式 ─────────────────────────────────────────────

/**
 * 將單一 Showdown 原始種族資料轉換為 NormalizedSpecies
 *
 * @param id     Showdown species ID（小寫無空格）
 * @param raw    原始種族資料
 * @param nameTw 繁體中文名稱（從 pokemon_list.json 對應）
 * @param keepRaw 是否保留原始資料備份
 */
export function normalizeSpecies(
  id: string,
  raw: ShowdownSpeciesRaw,
  nameTw = "",
  keepRaw = false
): NormalizedSpecies {
  const stats: NormalizedBaseStats = {
    ...raw.baseStats,
    bst: computeBST(raw.baseStats),
  };

  return {
    id,
    num: raw.num,
    name: raw.name,
    nameTw,
    types: raw.types,
    abilities: extractAbilities(raw),
    stats,
    tier: raw.tier,
    doublesTier: raw.doublesTier,
    isAltForm: !!raw.baseSpecies,
    baseSpecies: raw.baseSpecies
      ? raw.baseSpecies.toLowerCase().replace(/[\s-]/g, "")
      : undefined,
    forme: raw.forme,
    prevo: raw.prevo,
    evos: raw.evos,
    learnsetId: resolveLearnsetId(id, raw),
    isNonstandard: raw.isNonstandard,
    ...(keepRaw ? { _raw: raw } : {}),
  };
}

/**
 * 批次轉換整份 Showdown pokedex.json
 *
 * @param data       完整的 pokedex.json 資料
 * @param nameTwMap  species ID → 繁體中文名稱對照表（選用）
 * @param options.keepRaw        是否保留 _raw 備份
 * @param options.excludePast    是否排除移出現行世代的種族（預設 true）
 * @param options.excludeAltForms 是否排除非基底的變化形態（預設 false）
 */
export function normalizePokedex(
  data: ShowdownPokedexData,
  nameTwMap: Record<string, string> = {},
  options: {
    keepRaw?: boolean;
    excludePast?: boolean;
    excludeAltForms?: boolean;
  } = {}
): Record<string, NormalizedSpecies> {
  const { keepRaw = false, excludePast = true, excludeAltForms = false } = options;
  const result: Record<string, NormalizedSpecies> = {};

  for (const [id, raw] of Object.entries(data)) {
    if (!raw.baseStats) continue;
    if (excludePast && raw.isNonstandard && raw.isNonstandard !== "CAP") continue;
    if (excludeAltForms && raw.baseSpecies) continue;

    result[id] = normalizeSpecies(id, raw, nameTwMap[id] ?? "", keepRaw);
  }

  return result;
}

// ── 查詢輔助函式 ─────────────────────────────────────────────

/** 取得某 tier 的所有種族 */
export function getSpeciesByTier(
  pokedex: Record<string, NormalizedSpecies>,
  tier: string
): NormalizedSpecies[] {
  return Object.values(pokedex).filter((s) => s.tier === tier);
}

/** 依特性名稱查找種族（含隱藏特性） */
export function getSpeciesByAbility(
  pokedex: Record<string, NormalizedSpecies>,
  abilityName: string
): NormalizedSpecies[] {
  const lower = abilityName.toLowerCase();
  return Object.values(pokedex).filter((s) => {
    const a = s.abilities;
    return (
      a.slot1.toLowerCase() === lower ||
      a.slot2?.toLowerCase() === lower ||
      a.hidden?.toLowerCase() === lower
    );
  });
}

/** 依屬性（交集）篩選種族 */
export function getSpeciesByTypes(
  pokedex: Record<string, NormalizedSpecies>,
  types: string[]
): NormalizedSpecies[] {
  if (types.length === 0) return Object.values(pokedex);
  return Object.values(pokedex).filter((s) =>
    types.every((t) => s.types.includes(t))
  );
}
