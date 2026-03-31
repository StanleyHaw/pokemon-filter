import { StatKey } from "../types/pokemon";

export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "攻擊",
  defense: "防禦",
  spAtk: "特攻",
  spDef: "特防",
  speed: "速度",
  total: "總和",
};

export const STAT_COLORS: Record<StatKey, string> = {
  hp: "#FF5959",
  attack: "#F5AC78",
  defense: "#FAE078",
  spAtk: "#9DB7F5",
  spDef: "#A7DB8D",
  speed: "#FA92B2",
  total: "#8e8e9a",
};

export const STAT_CSS_CLASS: Record<StatKey, string> = {
  hp: "stat-hp",
  attack: "stat-attack",
  defense: "stat-defense",
  spAtk: "stat-spatk",
  spDef: "stat-spdef",
  speed: "stat-speed",
  total: "stat-total",
};

export const DEFAULT_STAT_RANGES: Record<StatKey, [number, number]> = {
  hp: [0, 255],
  attack: [0, 255],
  defense: [0, 255],
  spAtk: [0, 255],
  spDef: [0, 255],
  speed: [0, 255],
  total: [175, 780],
};

export const STAT_MIN: Record<StatKey, number> = {
  hp: 0,
  attack: 0,
  defense: 0,
  spAtk: 0,
  spDef: 0,
  speed: 0,
  total: 175,
};

export const STAT_MAX: Record<StatKey, number> = {
  hp: 255,
  attack: 255,
  defense: 255,
  spAtk: 255,
  spDef: 255,
  speed: 255,
  total: 780,
};

export const ALL_STAT_KEYS: StatKey[] = [
  "hp", "attack", "defense", "spAtk", "spDef", "speed", "total"
];
