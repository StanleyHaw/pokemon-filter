/**
 * Showdown 招式 flags 的中文說明與 UI tag 對照表
 *
 * 使用方式：
 *   import { FLAG_DICTIONARY, getFlagsByCategory } from './flagDictionary';
 *   const tag = FLAG_DICTIONARY.contact.uiTag;  // "isContactMove"
 *   const battleFlags = getFlagsByCategory("battle");
 */

export type FlagKey =
  | "contact"
  | "protect"
  | "mirror"
  | "heal"
  | "sound"
  | "bullet"
  | "pulse"
  | "punch"
  | "bite"
  | "slicing"
  | "dance"
  | "wind"
  | "powder"
  | "reflectable"
  | "bypasssub"
  | "metronome"
  | "recharge"
  | "charge"
  | "authentic"
  | "allyanim"
  | "futuremove"
  | "gravity"
  | "defrost"
  | "noparentalbond"
  | "mustpressure"
  | "failcopycat"
  | "failencore"
  | "failinstruct"
  | "failmimic"
  | "nosketching";

/**
 * 篩選分類：
 *   battle      — 對戰中直接影響攻防互動（適合作為 UI 篩選標籤）
 *   interaction — 影響輔助招式或複製機制（可作為進階篩選）
 *   misc        — 系統/模擬器內部機制，一般玩家較少直接篩選
 */
export type FlagCategory = "battle" | "interaction" | "misc";

export interface FlagInfo {
  key: FlagKey;
  /** 繁體中文顯示標籤（UI 篩選按鈕用） */
  label: string;
  /** 完整說明文字（工具提示/說明頁用） */
  description: string;
  /** 對應的 MoveTags 欄位名稱（e.g. "isContactMove"） */
  uiTag: string;
  filterCategory: FlagCategory;
}

export const FLAG_DICTIONARY: Record<FlagKey, FlagInfo> = {
  contact: {
    key: "contact",
    label: "接觸技",
    description:
      "使用時攻守雙方身體接觸，會觸發靜電（Static）、火焰之軀（Flame Body）、毒刺（Poison Point）等接觸特性。",
    uiTag: "isContactMove",
    filterCategory: "battle",
  },
  protect: {
    key: "protect",
    label: "可被守護擋住",
    description: "可被守護（Protect）、偵測（Detect）、寬闊守護（Wide Guard）等防禦招式完全阻擋。",
    uiTag: "isProtectable",
    filterCategory: "battle",
  },
  mirror: {
    key: "mirror",
    label: "可被鏡面複製",
    description: "可被鏡面（Mirror Move）學習並反射回去。",
    uiTag: "isMirrorMove",
    filterCategory: "interaction",
  },
  heal: {
    key: "heal",
    label: "回復技",
    description: "恢復使用者 HP 的招式，受療癒封鎖（Heal Block）影響而無法使用。",
    uiTag: "isHealingMove",
    filterCategory: "battle",
  },
  sound: {
    key: "sound",
    label: "聲音技",
    description:
      "以聲波為媒介，可穿透替身（Substitute）直接命中對手。防音特性（Soundproof）完全免疫。",
    uiTag: "isSoundMove",
    filterCategory: "battle",
  },
  bullet: {
    key: "bullet",
    label: "彈丸技",
    description: "以砲彈或球形物體發射的招式，防彈特性（Bulletproof）完全免疫。",
    uiTag: "isBulletMove",
    filterCategory: "battle",
  },
  pulse: {
    key: "pulse",
    label: "波動技",
    description: "以能量波動為媒介，超古代特性（Mega Launcher）將威力提升至 1.5 倍。",
    uiTag: "isPulseMove",
    filterCategory: "battle",
  },
  punch: {
    key: "punch",
    label: "拳招",
    description: "以拳頭為主要攻擊手段，鐵拳特性（Iron Fist）將威力提升至 1.2 倍。",
    uiTag: "isPunchMove",
    filterCategory: "battle",
  },
  bite: {
    key: "bite",
    label: "咬招",
    description: "以牙齒咬住對手，大顎特性（Strong Jaw）將威力提升至 1.5 倍。",
    uiTag: "isBiteMove",
    filterCategory: "battle",
  },
  slicing: {
    key: "slicing",
    label: "斬擊技",
    description: "以刀刃或利爪進行斬擊，鋒銳特性（Sharpness）將威力提升至 1.5 倍。",
    uiTag: "isSlicingMove",
    filterCategory: "battle",
  },
  dance: {
    key: "dance",
    label: "舞蹈技",
    description: "以舞蹈動作發動，舞踏特性（Dancer）可複製對手使用的舞蹈招式。",
    uiTag: "isDanceMove",
    filterCategory: "battle",
  },
  wind: {
    key: "wind",
    label: "風技",
    description:
      "以風力為媒介，乘風特性（Wind Rider）完全免疫且攻擊提升一階；逆風特性（Wind Power）提升充能狀態。",
    uiTag: "isWindMove",
    filterCategory: "battle",
  },
  powder: {
    key: "powder",
    label: "粉末技",
    description:
      "散布粉末或孢子，草系寶可夢和擁有防塵特性（Overcoat）或安全護目鏡（Safety Goggles）道具的寶可夢完全免疫。",
    uiTag: "isPowderMove",
    filterCategory: "battle",
  },
  reflectable: {
    key: "reflectable",
    label: "可反彈",
    description: "可被魔法反射（Magic Coat）或魔法鏡特性（Magic Bounce）反彈回攻擊方。",
    uiTag: "isReflectable",
    filterCategory: "battle",
  },
  bypasssub: {
    key: "bypasssub",
    label: "無視替身",
    description: "可穿透替身（Substitute）直接對本體造成效果，不受替身阻擋。",
    uiTag: "isBypassSubstitute",
    filterCategory: "battle",
  },
  metronome: {
    key: "metronome",
    label: "可被亂用招式抽到",
    description: "可被亂用招式（Metronome）隨機選中後使用。",
    uiTag: "isMetronomeCompatible",
    filterCategory: "misc",
  },
  recharge: {
    key: "recharge",
    label: "需要蓄力回合",
    description: "使用後下一回合必須蓄力（如大爆炸後的廢招回合）。",
    uiTag: "needsRecharge",
    filterCategory: "misc",
  },
  charge: {
    key: "charge",
    label: "需要充能",
    description: "第一回合蓄力，第二回合才發動（如飛翔、潛水、挖洞）。",
    uiTag: "needsCharge",
    filterCategory: "misc",
  },
  authentic: {
    key: "authentic",
    label: "無視迴避修正",
    description: "命中計算無視迴避率與命中率的能力等級調整，但道具與特性仍有效。",
    uiTag: "isAuthentic",
    filterCategory: "battle",
  },
  allyanim: {
    key: "allyanim",
    label: "影響同伴動畫",
    description: "影響我方同伴的動畫播放，為模擬器內部標記，不影響對戰邏輯。",
    uiTag: "isAllyAnim",
    filterCategory: "misc",
  },
  futuremove: {
    key: "futuremove",
    label: "未來招式",
    description:
      "延遲兩回合後才對目標造成傷害（如未來預見、輔助力量），發動時的防禦方數值計算。",
    uiTag: "isFutureMove",
    filterCategory: "misc",
  },
  gravity: {
    key: "gravity",
    label: "受重力場影響",
    description: "在重力場（Gravity）狀態下，原本因飛行或懸浮而無效的招式可以命中。",
    uiTag: "isGravityAffected",
    filterCategory: "misc",
  },
  defrost: {
    key: "defrost",
    label: "可解凍自身",
    description: "使用者處於冰凍狀態時，使用此招式可解除凍結後立即攻擊。",
    uiTag: "canDefrost",
    filterCategory: "battle",
  },
  noparentalbond: {
    key: "noparentalbond",
    label: "不受親子愛加成",
    description: "擁有親子愛特性（Parental Bond）的寶可夢使用此招式時，不會打出第二次攻擊。",
    uiTag: "noParentalBond",
    filterCategory: "interaction",
  },
  mustpressure: {
    key: "mustpressure",
    label: "必定觸發壓迫感",
    description: "無論目標有無壓迫感特性（Pressure），使用此招式必定額外消耗 PP。",
    uiTag: "mustPressure",
    filterCategory: "misc",
  },
  failcopycat: {
    key: "failcopycat",
    label: "無法被仿效",
    description: "仿效招式（Copycat）嘗試複製此招式時必定失敗。",
    uiTag: "failsCopycat",
    filterCategory: "interaction",
  },
  failencore: {
    key: "failencore",
    label: "無法被返場強制",
    description: "返場（Encore）嘗試強制重複使用此招式時必定失敗。",
    uiTag: "failsEncore",
    filterCategory: "interaction",
  },
  failinstruct: {
    key: "failinstruct",
    label: "無法被命令再次使用",
    description: "命令（Instruct）嘗試指定再次使用此招式時必定失敗。",
    uiTag: "failsInstruct",
    filterCategory: "interaction",
  },
  failmimic: {
    key: "failmimic",
    label: "無法被模仿學習",
    description: "模仿（Mimic）嘗試暫時學習此招式時必定失敗。",
    uiTag: "failsMimic",
    filterCategory: "interaction",
  },
  nosketching: {
    key: "nosketching",
    label: "無法被素描永久學習",
    description: "素描（Sketch）嘗試永久學習此招式時必定失敗。",
    uiTag: "noSketching",
    filterCategory: "interaction",
  },
};

// ── 便利查詢函式 ─────────────────────────────────────────────

/** 取得特定分類下的所有 flag 資訊 */
export function getFlagsByCategory(category: FlagCategory): FlagInfo[] {
  return Object.values(FLAG_DICTIONARY).filter((f) => f.filterCategory === category);
}

/** 從 flag key 取得 UI tag 名稱 */
export function getFlagUiTag(flagKey: FlagKey): string {
  return FLAG_DICTIONARY[flagKey]?.uiTag ?? flagKey;
}

/** 從 Showdown flags 物件中提取包含的 flag key 列表 */
export function extractFlags(flags: Partial<Record<string, 1>>): FlagKey[] {
  return Object.keys(flags).filter((k): k is FlagKey => k in FLAG_DICTIONARY) as FlagKey[];
}
