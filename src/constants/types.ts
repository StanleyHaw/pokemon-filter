export const TYPE_LABELS: Record<string, string> = {
  normal: "一般",
  fire: "火",
  water: "水",
  electric: "電",
  grass: "草",
  ice: "冰",
  fighting: "格鬥",
  poison: "毒",
  ground: "地面",
  flying: "飛行",
  psychic: "超能力",
  bug: "蟲",
  rock: "岩石",
  ghost: "幽靈",
  dragon: "龍",
  dark: "惡",
  steel: "鋼",
  fairy: "妖精",
};

export const ALL_TYPES = Object.keys(TYPE_LABELS);

export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const GENERATION_LABELS: Record<number, string> = {
  1: "第一世代",
  2: "第二世代",
  3: "第三世代",
  4: "第四世代",
  5: "第五世代",
  6: "第六世代",
  7: "第七世代",
  8: "第八世代",
  9: "第九世代",
};
