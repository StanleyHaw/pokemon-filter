/**
 * 專案自訂特性群組定義（方案 B）
 *
 * 用途：定義具有「戰術語意」的特性集合，供篩選器使用。
 * 這些群組無法從 PokéAPI 或 Showdown 原生 flags 推導，需手動維護。
 *
 * ── ID 格式說明 ────────────────────────────────────────────────
 * 目前 abilityIds 使用 PokéAPI kebab-case slug（例如 "sand-stream"）。
 * 理由：篩選時直接對 PokemonSummary.abilities[].name，無需額外轉換。
 *
 * ⚠️  這是暫時依附於 PokéAPI slug 的設計。
 * 若未來引入統一的 ability data source 或改用 Showdown ID，
 * 只需替換 normalizeAbilityId() 的實作，以及下方各群組的 abilityIds。
 * 篩選邏輯（useFilteredPokemon）應透過 normalizeAbilityId 比對，
 * 不要在各處直接硬寫格式假設。
 *
 * ── 語意說明 ───────────────────────────────────────────────────
 * 查詢時以「某 Pokémon 的任一可用特性（特性一 / 特性二 / 隱藏特性）」
 * 來判斷是否命中群組，不限制「實戰中同時啟用的單一特性」。
 * 例如：某隻寶可夢有 [intimidate, cloud-nine, justified]，
 * 三個特性都會參與群組比對，不論實戰上只會選其中一個。
 * 未來若需「嚴格單特性模式」，可在此介面新增 strictMode 旗標，
 * 或在 FilterState 層面增加 abilitySlotFilter 限制。
 *
 * 新增群組：
 *   1. 在 AbilityGroupId union 加入新 key
 *   2. 在 ABILITY_GROUPS 加入對應的定義
 */

// ── ID 正規化 helper ──────────────────────────────────────────
/**
 * 將 PokéAPI ability slug 轉為群組內部比對用的 normalized ID。
 * 目前實作：直接回傳原值（因 PokéAPI slug 已是 kebab-case）。
 *
 * 若未來切換到 Showdown ID 或其他格式，只需修改此函式。
 * 使用端（useFilteredPokemon）應永遠透過此函式取得比對用 ID，
 * 不要直接假設 abilityIds 的格式。
 */
export function normalizeAbilityId(apiSlug: string): string {
  return apiSlug; // 暫時 passthrough；未來可改為 toShowdownId 或其他轉換
}

// ── 型別定義 ──────────────────────────────────────────────────

export type AbilityGroupId =
  | "weatherSetters"
  | "weatherSpeedBoosters"
  | "antiStatDrop"
  | "offensivePower"
  | "pivotSupport";

export interface AbilityGroupDef {
  id: AbilityGroupId;
  /** UI 顯示標籤（繁體中文） */
  label: string;
  /** 工具提示說明 */
  description: string;
  /**
   * PokéAPI ability slug 列表（kebab-case）。
   * 比對時請透過 normalizeAbilityId() 轉換後再比對，
   * 不要直接假設此陣列的格式與 PokemonSummary.abilities[].name 一致。
   */
  abilityIds: readonly string[];
}

// ── 群組定義 ──────────────────────────────────────────────────

export const ABILITY_GROUPS: Record<AbilityGroupId, AbilityGroupDef> = {
  /**
   * 天氣啟動特性
   * 含一般天氣特性（出場自動啟動）以及三神獸的極端天氣特性。
   */
  weatherSetters: {
    id: "weatherSetters",
    label: "天氣啟動",
    description: "登場時自動啟動天氣效果的特性（含極端天氣）",
    abilityIds: [
      "drizzle",         // 雨引（降雨）
      "drought",         // 日照（晴天）
      "sand-stream",     // 沙流（沙暴）
      "snow-warning",    // 降雪（冰雹/積雪）
      "primordial-sea",  // 原始大海（Kyogre，極端降雨）
      "desolate-land",   // 焦土大地（Groudon，極端晴天）
      "delta-stream",    // 逆鱗之氣（Rayquaza，神祕氣流）
    ],
  },

  /**
   * 天氣速度受益特性
   * 在特定天氣下速度翻倍的特性，常見於天氣隊輸出位。
   */
  weatherSpeedBoosters: {
    id: "weatherSpeedBoosters",
    label: "天氣速增",
    description: "在特定天氣下速度倍增的特性（雨/晴/沙/雪）",
    abilityIds: [
      "swift-swim",  // 疾游（雨天速度 ×2）
      "chlorophyll", // 葉綠素（晴天速度 ×2）
      "sand-rush",   // 沙暴衝擊（沙暴速度 ×2）
      "slush-rush",  // 積雪急走（冰雹/積雪速度 ×2）
    ],
  },

  /**
   * 抗能力下降 / 抗威嚇特性
   * 包含：完全免疫能力下降、反射能力下降、威嚇免疫、被降能力時自我強化。
   */
  antiStatDrop: {
    id: "antiStatDrop",
    label: "抗能力下降",
    description: "免疫或反制能力下降效果的特性（含抗威嚇、被降時反強化）",
    abilityIds: [
      // 完全免疫任何能力下降
      "clear-body",       // 障壁
      "white-smoke",      // 白色煙霧
      "full-metal-body",  // 金屬防壁（Solgaleo）

      // 反射能力下降回對手
      "mirror-armor",     // 鏡甲（Corviknight）

      // 威嚇免疫（Gen 8+ 同時使心靈感應、悠然自得等免疫威嚇）
      "inner-focus",      // 精神力
      "own-tempo",        // 悠然自得
      "oblivious",        // 呆頭呆腦
      "scrappy",          // 無畏

      // 威嚇命中時攻擊上升（轉正）
      "guard-dog",        // 護衛犬（Mabosstiff）

      // 任意能力被降時自我強化
      "defiant",          // 不服輸（攻擊 +2）
      "competitive",      // 不屈之志（特攻 +2）

      // 特定能力不可被降
      "hyper-cutter",     // 大鄂力（攻擊不下降）
    ],
  },

  /**
   * 火力強化特性
   * 直接或間接提升輸出火力的特性，含招式威力強化、攻擊數值強化、屬性加成、滾雪球型。
   */
  offensivePower: {
    id: "offensivePower",
    label: "火力強化",
    description: "提升輸出威力的特性（招式加成、能力強化、屬性倍率、KO 後滾雪球）",
    abilityIds: [
      // STAB 加成
      "adaptability",    // 適應力（STAB ×2.0）

      // 全招式威力強化
      "sheer-force",     // 強行（附加效果招式 ×1.3，移除附加效果）
      "technician",      // 技術家（威力 ≤ 60 的招式 ×1.5）
      "reckless",        // 蠻不在乎（反動招式 ×1.2）
      "tough-claws",     // 硬爪（接觸技 ×1.33，Mega 系列）
      "neuroforce",      // 腦核之力（超效招式 ×1.25，Necrozma-Ultra）
      "tinted-lens",     // 色彩鏡（效果一般 → ×2，效果弱 → ×4）

      // 特定招式分類加成
      "strong-jaw",      // 強顎（咬技 ×1.5）
      "iron-fist",       // 鋼拳（拳技 ×1.2）
      "mega-launcher",   // 波動擴散（波動技 / 脈衝技 ×1.5）

      // 攻擊數值強化
      "hustle",          // 努力（攻擊 ×1.5，命中 ×0.8）
      "gorilla-tactics", // 一猩一意（攻擊 ×1.5，鎖定一招）

      // 屬性倍率
      "transistor",      // 電晶體（電系招式 ×1.5，Regieleki）
      "dragons-maw",     // 龍顎（龍系招式 ×1.5，Regidrago）

      // KO 後累積強化
      "moxie",           // 勝者气概（KO 後攻擊 +1）
      "beast-boost",     // 異獸提升（KO 後最高個體值能力 +1，日月獸）
    ],
  },

  /**
   * 換場輔助特性
   * 強化換場節奏或為隊友提供間接支援的特性。
   * 注意：此群組偏向「戰術循環價值」而非純輸出，因此不含 magic-guard（生存容錯特性）。
   */
  pivotSupport: {
    id: "pivotSupport",
    label: "換場輔助",
    description: "強化換場節奏或支援隊友的特性（再生力、威嚇、魔法反射等）",
    abilityIds: [
      "regenerator",    // 再生力（換出時回復 1/3 HP，折返輔助核心）
      "natural-cure",   // 自然回復（換出時解除異常狀態）
      "intimidate",     // 威嚇（登場使對手攻擊 -1，換入干擾）
      "prankster",      // 惡作劇之心（變化技取得先制 +1）
      "magic-bounce",   // 魔法反射（反射對手變化技，換入封鎖佈陣）
    ],
  },
};

// ── 便利查詢函式 ──────────────────────────────────────────────

export function getAbilityGroupIds(): AbilityGroupId[] {
  return Object.keys(ABILITY_GROUPS) as AbilityGroupId[];
}

/** 判斷某 PokéAPI ability slug 是否屬於指定群組 */
export function abilityInGroup(apiSlug: string, groupId: AbilityGroupId): boolean {
  const normalizedSlug = normalizeAbilityId(apiSlug);
  return ABILITY_GROUPS[groupId].abilityIds.some(
    (id) => normalizeAbilityId(id) === normalizedSlug
  );
}

/** 取得某 PokéAPI ability slug 所屬的所有群組 */
export function getGroupsForAbility(apiSlug: string): AbilityGroupId[] {
  return getAbilityGroupIds().filter((gid) => abilityInGroup(apiSlug, gid));
}
