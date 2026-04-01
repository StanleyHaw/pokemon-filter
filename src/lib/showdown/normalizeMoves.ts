import type {
  ShowdownMoveRaw,
  ShowdownMovesData,
  ShowdownBoosts,
  ShowdownSecondary,
  MoveCategory,
  MoveTags,
  MoveEffects,
  NormalizedMove,
  StatBoostMap,
} from "../../types/move";

// ── 輔助函式 ─────────────────────────────────────────────────

/** 將 [分子, 分母] 分數轉換為小數（e.g. [1, 2] → 0.5） */
function toFraction([num, den]: [number, number]): number {
  return num / den;
}

/** 從 secondary / secondaries 中取出主要效果（第一個有意義的 secondary） */
function getPrimarySecondary(
  raw: ShowdownMoveRaw
): ShowdownSecondary | undefined {
  if (raw.secondary) return raw.secondary;
  if (raw.secondaries?.length) return raw.secondaries[0];
  return undefined;
}

function normalizeBoosts(boosts: ShowdownBoosts | undefined): StatBoostMap | undefined {
  if (!boosts) return undefined;
  const result: StatBoostMap = {};
  const keys: (keyof ShowdownBoosts)[] = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
  for (const k of keys) {
    if (boosts[k] !== undefined) result[k] = boosts[k];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** 從 raw 資料建立 MoveEffects */
function buildEffects(raw: ShowdownMoveRaw): MoveEffects {
  const effects: MoveEffects = {};
  const secondary = getPrimarySecondary(raw);

  // 主要狀態異常（直接對目標，非附加效果）
  if (raw.status) effects.status = raw.status;
  else if (secondary?.status) effects.status = secondary.status;

  // 揮發狀態
  if (raw.volatileStatus) effects.volatileStatus = raw.volatileStatus;
  else if (secondary?.volatileStatus) effects.volatileStatus = secondary.volatileStatus;

  // 目標 stat 變化
  const targetBoosts = normalizeBoosts(raw.boosts ?? secondary?.boosts);
  if (targetBoosts) effects.statBoosts = targetBoosts;

  // 使用者自身 stat 變化
  const selfBoostsRaw =
    raw.self?.boosts ?? raw.selfBoost?.boosts ?? secondary?.self?.boosts;
  const selfBoosts = normalizeBoosts(selfBoostsRaw);
  if (selfBoosts) effects.selfBoosts = selfBoosts;

  // 吸血 / 反動 / 回復
  if (raw.drain) effects.drain = toFraction(raw.drain);
  if (raw.recoil) effects.recoil = toFraction(raw.recoil);
  if (raw.heal) effects.heal = toFraction(raw.heal);

  // 連續攻擊
  if (raw.multihit !== undefined) effects.multihit = raw.multihit;

  // 附加效果觸發機率
  if (secondary?.chance !== undefined) effects.secondaryChance = secondary.chance;

  return effects;
}

/** 從 raw 資料建立 MoveTags */
function buildTags(raw: ShowdownMoveRaw, effects: MoveEffects): MoveTags {
  const f = raw.flags ?? {};
  const priority = raw.priority ?? 0;
  const secondary = getPrimarySecondary(raw);

  const hasSecondary =
    !!secondary?.status ||
    !!secondary?.volatileStatus ||
    !!secondary?.boosts ||
    !!secondary?.self;

  return {
    // 接觸 / 特性互動
    isContactMove: !!f.contact,
    isSoundMove: !!f.sound,
    isPunchMove: !!f.punch,
    isBiteMove: !!f.bite,
    isSlicingMove: !!f.slicing,
    isBulletMove: !!f.bullet,
    isPulseMove: !!f.pulse,
    isDanceMove: !!f.dance,
    isWindMove: !!f.wind,
    isPowderMove: !!f.powder,

    // 對戰互動
    isProtectable: !!f.protect,
    isReflectable: !!f.reflectable,
    isBypassSubstitute: !!f.bypasssub,
    isMirrorMove: !!f.mirror,
    isHealingMove: !!f.heal,

    // 先制 / 後制
    isHighPriority: priority > 0,
    isLowPriority: priority < 0,

    // 計算得出
    isMultiHit: raw.multihit !== undefined,
    hasRecoil: !!raw.recoil,
    hasDrain: !!raw.drain,
    hasSecondaryEffect: hasSecondary,
    inflictsStatus: !!(effects.status),
    inflictsVolatileStatus: !!(effects.volatileStatus),
    hasStatBoost: !!(effects.statBoosts),
    hasSelfBoost: !!(effects.selfBoosts),
  };
}

// ── 主要轉換函式 ─────────────────────────────────────────────

/**
 * 將單一 Showdown 原始招式轉換為 NormalizedMove
 *
 * @param id    Showdown move ID（小寫無空格）
 * @param raw   原始招式資料
 * @param nameTw 繁體中文名稱（從 moveNamesCn.ts 或其他來源預先對應）
 * @param keepRaw 是否保留原始資料備份（預設 false）
 */
export function normalizeMove(
  id: string,
  raw: ShowdownMoveRaw,
  nameTw = "",
  keepRaw = false
): NormalizedMove {
  const effects = buildEffects(raw);
  const tags = buildTags(raw, effects);

  return {
    id,
    num: raw.num,
    name: raw.name,
    nameTw,
    type: raw.type,
    category: raw.category.toLowerCase() as MoveCategory,
    basePower: raw.basePower,
    accuracy: raw.accuracy === true ? null : raw.accuracy,
    pp: raw.pp,
    priority: raw.priority ?? 0,
    target: raw.target,
    tags,
    effects,
    isNonstandard: raw.isNonstandard,
    isZMove: !!raw.isZ,
    isMaxMove: !!raw.isMax,
    ...(keepRaw ? { _raw: raw } : {}),
  };
}

/**
 * 批次轉換整份 Showdown moves.json
 *
 * @param data    完整的 moves.json 資料
 * @param nameTwMap 招式 ID → 繁體中文名稱對照表（選用）
 * @param options.keepRaw     是否保留 _raw 備份
 * @param options.excludePast 是否排除 isNonstandard: "Past" 的招式（預設 true）
 */
export function normalizeMoves(
  data: ShowdownMovesData,
  nameTwMap: Record<string, string> = {},
  options: { keepRaw?: boolean; excludePast?: boolean } = {}
): Record<string, NormalizedMove> {
  const { keepRaw = false, excludePast = true } = options;
  const result: Record<string, NormalizedMove> = {};

  for (const [id, raw] of Object.entries(data)) {
    // 排除非標準招式（Past = 已移除，Future = 未來世代）
    if (excludePast && (raw.isNonstandard === "Past" || raw.isNonstandard === "Future")) {
      continue;
    }
    // 排除 Z 招式與 Max 招式（為特殊機制，通常不直接篩選）
    if (raw.isZ || raw.isMax) continue;

    result[id] = normalizeMove(id, raw, nameTwMap[id] ?? "", keepRaw);
  }

  return result;
}

// ── 查詢輔助函式 ─────────────────────────────────────────────

/** 依 tag 過濾招式 */
export function filterMovesByTag(
  moves: Record<string, NormalizedMove>,
  tag: keyof MoveTags
): NormalizedMove[] {
  return Object.values(moves).filter((m) => m.tags[tag]);
}

/** 取得所有先制技（priority > 0） */
export function getHighPriorityMoves(
  moves: Record<string, NormalizedMove>
): NormalizedMove[] {
  return Object.values(moves).filter((m) => m.priority > 0);
}
