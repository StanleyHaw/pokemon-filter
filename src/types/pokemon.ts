import type { MoveTags } from "./move";
export type { MoveTags };
import type { MoveGroupId } from "../constants/moveGroups";
export type { MoveGroupId };
import type { AbilityGroupId } from "../constants/abilityGroups";
export type { AbilityGroupId };

export type StatKey = "hp" | "attack" | "defense" | "spAtk" | "spDef" | "speed" | "total";
export type SortDirection = "asc" | "desc";
export type DamageClass = "physical" | "special" | "status";
export type TypeFilterMode = "intersection" | "union";
export type EvolutionCategory = "final" | "solo" | "baby" | "mega" | "has-mega" | "middle" | "twice" | "branching";
export type TriState = "only" | "exclude" | null;

/**
 * 戰術招式篩選子條件
 *
 * 僅在 moveGroupFilter 有選擇時生效，用來收斂各群組內的候選招式。
 * 這些條件不影響 direct move search（moveFilter）。
 */
export interface TacticalMoveFilters {
  /** 物理 / 特殊 / 變化；'' = 不限 */
  damageClass: string;
  /** 招式屬性（e.g. "fire"）；'' = 不限 */
  type: string;
  /**
   * 目標範圍（Showdown target key）；'' = 不限
   * @deprecated v1 UI 已停用（Phase 3.5 移除）。欄位保留供未來重接，但目前不影響任何篩選結果。
   */
  target: string;
  powerMin: number;
  powerMax: number;
  /** 0 = 必中視為通過最低命中 */
  accuracyMin: number;
  accuracyMax: number;
}

export interface PokemonSummary {
  id: number;
  name: string;
  nameTw: string;
  types: string[];
  abilities: { name: string; nameTw: string; isHidden: boolean }[];
  height: number; // decimetres
  weight: number; // hectograms
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
    total: number;
  };
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
  evolvesFromId: number | null;
  hasMega: boolean;
  speciesId: number;
  spriteUrl: string;
  spriteShinyUrl: string;
}

export interface MoveDetail {
  id: number;
  name: string;
  nameTw: string;
  type: string;
  damageClass: DamageClass;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  effect: string;
  target?: string;
  learnedByPokemon: { name: string; id: number; nameTw: string }[];
}

export interface FilterState {
  statRanges: Record<StatKey, [number, number]>;
  types: string[];
  typeFilterMode: TypeFilterMode;
  generations: number[];
  searchText: string;
  restrictedFilter: TriState;
  unrestrictedFilter: TriState;
  mythicalFilter: TriState;
  evolutionFilter: Partial<Record<EvolutionCategory, TriState>>;
  abilityFilter: string[];
  singleTypeOnly: boolean;
  dualTypeOnly: boolean;
  moveFilter: MoveDetail[];
  /** 招式標籤篩選（交集：寶可夢招式庫中至少一個招式同時符合所有選中 tag） */
  moveTagFilter: (keyof MoveTags)[];
  /** 自訂招式群組篩選（各群組間 AND，群組內 OR） */
  moveGroupFilter: MoveGroupId[];
  /**
   * 自訂特性群組篩選（各群組間 AND，群組內 OR）
   *
   * 語意：對每個選中的群組，Pokémon 至少要有一個可用特性（特性一/二/隱藏特性）
   * 屬於該群組，所有選中群組都需命中才保留（群組間 AND）。
   * 判斷時以「任一可用特性集合」為準，不限制「實戰同時啟用的單一特性」。
   *
   * 與 abilityFilter（直接特性名稱搜尋）的關係：
   * 兩者之間是 AND，同時有 abilityFilter 與 abilityGroupFilter 時，
   * Pokémon 必須同時滿足兩個條件才保留。
   */
  abilityGroupFilter: AbilityGroupId[];
  tacticalMoveFilters: TacticalMoveFilters;
}

export interface SortConfig {
  key: StatKey | "id" | "nameTw" | "height" | "weight";
  direction: SortDirection;
}
