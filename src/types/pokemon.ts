export type StatKey = "hp" | "attack" | "defense" | "spAtk" | "spDef" | "speed" | "total";
import type { MoveTags } from "./move";
export type { MoveTags };
import type { MoveGroupId } from "../constants/moveGroups";
export type { MoveGroupId };
export type SortDirection = "asc" | "desc";
export type DamageClass = "physical" | "special" | "status";

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

export type TypeFilterMode = "intersection" | "union";
export type EvolutionCategory = "final" | "solo" | "baby" | "mega" | "has-mega" | "middle" | "twice" | "branching";
export type TriState = "only" | "exclude" | null;

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
}

export interface SortConfig {
  key: StatKey | "id" | "nameTw" | "height" | "weight";
  direction: SortDirection;
}
