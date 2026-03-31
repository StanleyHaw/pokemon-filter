export const MOVE_CATEGORY_LABELS: Record<string, string> = {
  "damage": "傷害",
  "ailment": "異常狀態",
  "net-good-stats": "能力提升",
  "net-bad-stats": "能力下降",
  "heal": "回復",
  "damage-ailment": "傷害+異常",
  "swagger": "混亂",
  "damage-lower": "傷害+能力下降",
  "damage-raise": "傷害+能力提升",
  "damage-heal": "傷害+回復",
  "ohko": "一擊必殺",
  "whole-field-effect": "全場效果",
  "field-effect": "場地效果",
  "force-switch": "強制替換",
  "unique": "特殊效果",
};

export const DAMAGE_CLASS_LABELS: Record<string, string> = {
  "physical": "物理",
  "special": "特殊",
  "status": "變化",
};

export const ALL_MOVE_CATEGORIES = Object.keys(MOVE_CATEGORY_LABELS);
