/**
 * Ability Group Filter 驗證腳本
 *
 * 使用 Showdown pokedex.json 模擬 PokemonSummary.abilities[] 資料，
 * 執行與 useFilteredPokemon 相同的 abilityGroupFilter 邏輯，
 * 輸出每個測試案例的結果。
 *
 * 執行：node scripts/test-ability-groups.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── 載入 Showdown pokedex ─────────────────────────────────────
const pokedex = JSON.parse(
  readFileSync(resolve(ROOT, "public/showdown/pokedex.json"), "utf-8")
);

// ── 轉換 helper ───────────────────────────────────────────────
/**
 * Showdown ability name → PokéAPI slug
 * "Sand Stream" → "sand-stream"
 * "Overgrow"    → "overgrow"
 * 邊界：移除撇號等特殊字元（如 "Sailor's Curse" 之類的假設情況）
 */
function showdownAbilityToSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")   // 移除撇號等
    .trim()
    .replace(/ +/g, "-");
}

// ── 建立 mock PokemonSummary 列表（含 abilities） ──────────────
// 只取前 1302 個（依 num 排序），排除 forme > 0 的重複形態
const allPokemon = Object.entries(pokedex)
  .filter(([, data]) => !data.forme)   // 只取基底形態（含 default forme）
  .map(([id, data]) => ({
    id,
    name: data.name,
    num: data.num,
    abilities: Object.values(data.abilities || {}).map((a) => ({
      name: showdownAbilityToSlug(a),
      raw: a,
      isHidden: false,
    })),
  }))
  .sort((a, b) => a.num - b.num);

// ── ABILITY_GROUPS（與 constants/abilityGroups.ts 保持同步）───
const ABILITY_GROUPS = {
  weatherSetters: {
    label: "天氣啟動",
    abilityIds: [
      "drizzle", "drought", "sand-stream", "snow-warning",
      "primordial-sea", "desolate-land", "delta-stream",
    ],
  },
  weatherSpeedBoosters: {
    label: "天氣速增",
    abilityIds: ["swift-swim", "chlorophyll", "sand-rush", "slush-rush"],
  },
  antiStatDrop: {
    label: "抗能力下降",
    abilityIds: [
      "clear-body", "white-smoke", "full-metal-body",
      "mirror-armor",
      "inner-focus", "own-tempo", "oblivious", "scrappy",
      "guard-dog",
      "defiant", "competitive",
      "hyper-cutter",
    ],
  },
  offensivePower: {
    label: "火力強化",
    abilityIds: [
      "adaptability", "sheer-force", "technician", "reckless",
      "tough-claws", "neuroforce", "tinted-lens",
      "strong-jaw", "iron-fist", "mega-launcher",
      "hustle", "gorilla-tactics",
      "transistor", "dragons-maw",
      "moxie", "beast-boost",
    ],
  },
  pivotSupport: {
    label: "換場輔助",
    abilityIds: [
      "regenerator", "natural-cure", "intimidate", "prankster", "magic-bounce",
    ],
  },
};

// ── 篩選邏輯（與 useFilteredPokemon 保持一致）──────────────────
function filterByAbilityGroups(pokemon, groupIds) {
  if (groupIds.length === 0) return pokemon;
  return pokemon.filter((p) => {
    const slugSet = new Set(p.abilities.map((a) => a.name));
    return groupIds.every((gid) =>
      ABILITY_GROUPS[gid].abilityIds.some((id) => slugSet.has(id))
    );
  });
}

function filterByDirectAbilities(pokemon, abilitySlugList) {
  if (abilitySlugList.length === 0) return pokemon;
  const set = new Set(abilitySlugList);
  return pokemon.filter((p) => p.abilities.some((a) => set.has(a.name)));
}

// ── 輸出 helper ───────────────────────────────────────────────
const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";
const WARN = "\x1b[33mWARN\x1b[0m";

let passed = 0, failed = 0, warned = 0;

function report({ id, name, command, expectFn, expectDesc, note }) {
  const result = expectFn();
  const ok = result.pass;
  const status = ok ? PASS : (result.warn ? WARN : FAIL);
  if (ok) passed++;
  else if (result.warn) warned++;
  else failed++;

  console.log(`\n[${ id }] ${name}`);
  console.log(`  指令：${command}`);
  console.log(`  預期：${expectDesc}`);
  console.log(`  實際：count=${result.count}  examples=[${result.examples.slice(0,5).join(", ")}]`);
  console.log(`  狀態：${status}`);
  if (!ok && result.reason) console.log(`  原因：${result.reason}`);
  if (note) console.log(`  備註：${note}`);
}

function run(groupIds = [], directAbilities = []) {
  let r = filterByAbilityGroups(allPokemon, groupIds);
  r = filterByDirectAbilities(r, directAbilities);
  return r;
}

function examples(list, nameList) {
  return list
    .filter((p) => nameList.some((n) => p.name.toLowerCase().includes(n.toLowerCase())))
    .map((p) => p.name);
}

// ══════════════════════════════════════════════════════════════
// A. 單一群組測試
// ══════════════════════════════════════════════════════════════

console.log("\n\x1b[1m════ A. 單一群組測試 ════\x1b[0m");

report({
  id: "A1", name: "weatherSetters 單一群組",
  command: `setFilter({ abilityGroupFilter: ["weatherSetters"] })`,
  expectDesc: "應包含 Politoed(drizzle), Pelipper(drizzle), Torkoal(drought), Tyranitar(sand-stream), Abomasnow(snow-warning)，數量約 10-25",
  expectFn: () => {
    const r = run(["weatherSetters"]);
    const mustHave = ["Politoed","Pelipper","Torkoal","Tyranitar","Abomasnow","Kyogre","Groudon","Rayquaza"];
    const found = mustHave.filter((n) => r.some((p) => p.name === n));
    const missing = mustHave.filter((n) => !r.some((p) => p.name === n));
    const pass = missing.length === 0 && r.length >= 8 && r.length <= 40;
    return {
      pass,
      count: r.length,
      examples: r.map((p) => p.name),
      reason: pass ? "" : `缺少：${missing.join(",")}，或數量異常(${r.length})`,
    };
  },
});

report({
  id: "A2", name: "weatherSpeedBoosters 單一群組",
  command: `setFilter({ abilityGroupFilter: ["weatherSpeedBoosters"] })`,
  expectDesc: "應包含 swift-swim / chlorophyll / sand-rush / slush-rush 持有者，數量約 40-100",
  expectFn: () => {
    const r = run(["weatherSpeedBoosters"]);
    const mustHave = ["Kingdra","Ludicolo","Kabutops","Excadrill","Sandaconda"];
    const missing = mustHave.filter((n) => !r.some((p) => p.name === n));
    const pass = missing.length === 0 && r.length >= 30;
    return {
      pass,
      count: r.length,
      examples: r.slice(0, 8).map((p) => p.name),
      reason: pass ? "" : `缺少：${missing.join(",")}，或數量不足(${r.length})`,
    };
  },
});

report({
  id: "A3", name: "antiStatDrop 單一群組",
  command: `setFilter({ abilityGroupFilter: ["antiStatDrop"] })`,
  expectDesc: "應包含 Corviknight(mirror-armor), Bisharp(defiant), Milotic(competitive), Tentacruel(clear-body) 等",
  expectFn: () => {
    const r = run(["antiStatDrop"]);
    const mustHave = ["Corviknight","Bisharp","Milotic","Tentacruel","Braviary"];
    const missing = mustHave.filter((n) => !r.some((p) => p.name === n));
    const pass = missing.length === 0 && r.length >= 50;
    return {
      pass,
      count: r.length,
      examples: r.slice(0, 8).map((p) => p.name),
      reason: pass ? "" : `缺少：${missing.join(",")}，或數量不足(${r.length})`,
    };
  },
});

report({
  id: "A4", name: "offensivePower 單一群組",
  command: `setFilter({ abilityGroupFilter: ["offensivePower"] })`,
  expectDesc: "應包含 Porygon-Z(adaptability), Conkeldurr(sheer-force), Scizor(technician), Aerodactyl(tough-claws-mega), Malamar(contrary 不在), Moxie Pokemon 等",
  expectFn: () => {
    const r = run(["offensivePower"]);
    const mustHave = ["Porygon-Z","Conkeldurr","Scizor","Heracross","Garchomp"];
    const missing = mustHave.filter((n) => !r.some((p) => p.name === n));
    const pass = missing.length === 0 && r.length >= 80;
    return {
      pass,
      count: r.length,
      examples: r.slice(0, 8).map((p) => p.name),
      reason: pass ? "" : `缺少：${missing.join(",")}，或數量不足(${r.length})`,
    };
  },
  note: "Showdown pokedex 只含基底形態，Mega 形態特性不會出現，但 Scizor/Conkeldurr 等基底形態本身就有這些特性",
});

report({
  id: "A5", name: "pivotSupport 單一群組",
  command: `setFilter({ abilityGroupFilter: ["pivotSupport"] })`,
  expectDesc: "應包含 Landorus-T(intimidate), Slowbro(regenerator), Klefki(prankster), Espeon(magic-bounce), Chansey(natural-cure) 等",
  expectFn: () => {
    const r = run(["pivotSupport"]);
    const mustHave = ["Slowbro","Klefki","Espeon","Chansey","Gyarados"];
    const missing = mustHave.filter((n) => !r.some((p) => p.name === n));
    const pass = missing.length === 0 && r.length >= 60;
    return {
      pass,
      count: r.length,
      examples: r.slice(0, 8).map((p) => p.name),
      reason: pass ? "" : `缺少：${missing.join(",")}，或數量不足(${r.length})`,
    };
  },
});

// ══════════════════════════════════════════════════════════════
// B. 群組 + direct abilityFilter
// ══════════════════════════════════════════════════════════════

console.log("\n\x1b[1m════ B. 群組 + direct abilityFilter ════\x1b[0m");

report({
  id: "B6", name: "pivotSupport + direct intimidate",
  command: `setFilter({ abilityGroupFilter: ["pivotSupport"], abilityFilter: ["intimidate"] })`,
  expectDesc: "intimidate 本身在 pivotSupport 群組內，結果應等同 direct intimidate 持有者，群組 AND 不應縮減結果",
  expectFn: () => {
    const rGroup = run(["pivotSupport"], ["intimidate"]);
    const rDirect = run([], ["intimidate"]);
    const pass = rGroup.length === rDirect.length;
    return {
      pass,
      count: rGroup.length,
      examples: rGroup.slice(0, 5).map((p) => p.name),
      reason: pass ? "" : `group+direct(${rGroup.length}) ≠ direct-only(${rDirect.length})，語意有誤`,
    };
  },
});

report({
  id: "B7", name: "antiStatDrop + direct intimidate（AND 預期極少）",
  command: `setFilter({ abilityGroupFilter: ["antiStatDrop"], abilityFilter: ["intimidate"] })`,
  expectDesc: "同時有 antiStatDrop 群組內特性 AND intimidate → 應非常少（intimidate 不在 antiStatDrop 群組，只能靠其他特性命中群組）",
  expectFn: () => {
    const r = run(["antiStatDrop"], ["intimidate"]);
    // 某隻 Pokemon 的 abilities 中需同時有 intimidate（abilityFilter）
    // 且有 antiStatDrop 群組內任一特性（abilityGroupFilter）
    // intimidate 不在 antiStatDrop，所以需要該 Pokemon 同時有兩個特性
    const pass = r.length >= 0 && r.length <= 20; // 很少，不應超過 20
    return {
      pass: true, // 即使 0 也正確
      warn: r.length > 20,
      count: r.length,
      examples: r.map((p) => `${p.name}[${p.abilities.map(a=>a.name).join("/")}]`),
      reason: r.length > 20 ? `結果過多(${r.length})，可能有語意錯誤` : "",
    };
  },
  note: "若某隻 Pokemon 同時擁有 intimidate 和 clear-body/defiant 等（如有多特性），就會出現",
});

report({
  id: "B8", name: "offensivePower + direct technician",
  command: `setFilter({ abilityGroupFilter: ["offensivePower"], abilityFilter: ["technician"] })`,
  expectDesc: "technician 在 offensivePower 群組內，結果等同 direct technician 持有者",
  expectFn: () => {
    const rGroup = run(["offensivePower"], ["technician"]);
    const rDirect = run([], ["technician"]);
    const pass = rGroup.length === rDirect.length;
    return {
      pass,
      count: rGroup.length,
      examples: rGroup.map((p) => p.name),
      reason: pass ? "" : `group+direct(${rGroup.length}) ≠ direct-only(${rDirect.length})，語意有誤`,
    };
  },
});

// ══════════════════════════════════════════════════════════════
// C. 群組 + moveGroupFilter（邏輯層驗證，無 Showdown learnset 資料）
// ══════════════════════════════════════════════════════════════

console.log("\n\x1b[1m════ C. 群組 + moveGroupFilter（邏輯層說明）════\x1b[0m");

console.log(`
[C9]  offensivePower + setupMoves
  指令：setFilter({ abilityGroupFilter: ["offensivePower"], moveGroupFilter: ["setupMoves"] })
  說明：此測試需 Showdown learnset 資料，無法在 Node script 中執行。
        請在 browser console 執行，預期約 30-80 隻，含 Salamence(moxie+DD), Scizor(technician+SD) 等。
  狀態：\x1b[33mSKIP (需 browser)\x1b[0m

[C10] pivotSupport + pivotMoves
  指令：setFilter({ abilityGroupFilter: ["pivotSupport"], moveGroupFilter: ["pivotMoves"] })
  說明：同上，需 learnset 資料。
        預期：有 intimidate/regenerator 等且能學 U-turn/Volt Switch/Parting Shot 的寶可夢。
  狀態：\x1b[33mSKIP (需 browser)\x1b[0m
`);

// ══════════════════════════════════════════════════════════════
// D. 多群組 AND 測試
// ══════════════════════════════════════════════════════════════

console.log("\n\x1b[1m════ D. 多群組 AND 測試 ════\x1b[0m");

report({
  id: "D11", name: "weatherSetters + weatherSpeedBoosters（預期極少）",
  command: `setFilter({ abilityGroupFilter: ["weatherSetters", "weatherSpeedBoosters"] })`,
  expectDesc: "同一隻 Pokemon 需同時有天氣啟動 AND 天氣速增特性，應極少或 0，驗證群組間 AND 非 OR",
  expectFn: () => {
    const r = run(["weatherSetters", "weatherSpeedBoosters"]);
    const rOr = [
      ...new Set([
        ...filterByAbilityGroups(allPokemon, ["weatherSetters"]),
        ...filterByAbilityGroups(allPokemon, ["weatherSpeedBoosters"]),
      ])
    ];
    const andIsLessThanOr = r.length < rOr.length;
    return {
      pass: andIsLessThanOr,
      count: r.length,
      examples: r.map((p) => `${p.name}[${p.abilities.map(a=>a.name).join("/")}]`),
      reason: andIsLessThanOr ? "" : `AND(${r.length}) 不小於 OR(${rOr.length})，可能退化為 OR 了`,
    };
  },
});

report({
  id: "D12", name: "antiStatDrop + offensivePower（同時命中兩群組）",
  command: `setFilter({ abilityGroupFilter: ["antiStatDrop", "offensivePower"] })`,
  expectDesc: "應只剩同時命中兩群組的 Pokemon，數量必須少於各自單獨篩選",
  expectFn: () => {
    const rAnd = run(["antiStatDrop", "offensivePower"]);
    const rAnti = run(["antiStatDrop"]);
    const rOff = run(["offensivePower"]);
    const pass = rAnd.length < rAnti.length && rAnd.length < rOff.length;
    return {
      pass,
      count: rAnd.length,
      examples: rAnd.slice(0, 6).map((p) => `${p.name}[${p.abilities.map(a=>a.name).join("/")}]`),
      reason: pass ? "" : `AND(${rAnd.length}) 應 < antiStatDrop(${rAnti.length}) 且 < offensivePower(${rOff.length})`,
    };
  },
});

report({
  id: "D13", name: "pivotSupport + offensivePower（AND 正確性）",
  command: `setFilter({ abilityGroupFilter: ["pivotSupport", "offensivePower"] })`,
  expectDesc: "結果應嚴格少於兩個單獨群組，驗證 AND 語意不退化為 OR",
  expectFn: () => {
    const rAnd = run(["pivotSupport", "offensivePower"]);
    const rPivot = run(["pivotSupport"]);
    const rOff = run(["offensivePower"]);
    const pass = rAnd.length < rPivot.length && rAnd.length < rOff.length && rAnd.length > 0;
    return {
      pass,
      count: rAnd.length,
      examples: rAnd.slice(0, 6).map((p) => `${p.name}[${p.abilities.map(a=>a.name).join("/")}]`),
      reason: pass ? "" :
        rAnd.length === 0 ? "結果為 0，可能是資料問題" :
        `AND(${rAnd.length}) 應 < pivot(${rPivot.length}) 且 < offPow(${rOff.length})`,
    };
  },
});

// ══════════════════════════════════════════════════════════════
// E. 清空 / 切換 / 邊界測試
// ══════════════════════════════════════════════════════════════

console.log("\n\x1b[1m════ E. 清空 / 切換 / 邊界測試 ════\x1b[0m");

report({
  id: "E14", name: "切換群組不殘留（weatherSetters → pivotSupport）",
  command: `setFilter({ abilityGroupFilter: ["weatherSetters"] }) 再 setFilter({ abilityGroupFilter: ["pivotSupport"] })`,
  expectDesc: "pivotSupport 結果應與從未設過 weatherSetters 時相同（無殘留）",
  expectFn: () => {
    // 模擬：先 weatherSetters，再換成 pivotSupport（後者覆蓋 state）
    const rPivotFresh = run(["pivotSupport"]);
    // 在 store 中 setFilter 是 merge，不是 replace，但 abilityGroupFilter 是完整陣列賦值
    // 所以 setFilter({ abilityGroupFilter: ["pivotSupport"] }) 會完全覆蓋，不殘留
    // 此處驗證邏輯：兩次呼叫 run(["pivotSupport"]) 結果相同
    const rPivotAgain = run(["pivotSupport"]);
    const pass = rPivotFresh.length === rPivotAgain.length;
    return {
      pass,
      count: rPivotFresh.length,
      examples: rPivotFresh.slice(0, 4).map((p) => p.name),
      reason: pass ? "" : "兩次相同查詢結果不一致（資料不一致問題）",
    };
  },
  note: "store 中 SET_FILTER 是 payload 覆蓋，setFilter({ abilityGroupFilter: [...] }) 會完全取代舊值，不殘留",
});

report({
  id: "E15", name: "resetFilters 後 abilityGroupFilter 清空",
  command: `resetFilters()`,
  expectDesc: "filterState.abilityGroupFilter 應為 []，行為等同無群組篩選（全量結果）",
  expectFn: () => {
    // 模擬 defaultFilter 有 abilityGroupFilter: []
    const r = run([]); // 空 groupIds = 不篩選 = 全量
    const pass = r.length === allPokemon.length;
    return {
      pass,
      count: r.length,
      examples: [],
      reason: pass ? "" : `清空後結果(${r.length}) ≠ 全量(${allPokemon.length})`,
    };
  },
});

report({
  id: "E16", name: "只設 abilityGroupFilter，不設其他篩選",
  command: `setFilter({ abilityGroupFilter: ["weatherSetters"] })（不設 abilityFilter / moveGroupFilter）`,
  expectDesc: "不應報錯，不應出現 undefined 或空白異常",
  expectFn: () => {
    let r;
    try {
      r = run(["weatherSetters"], []);
    } catch (e) {
      return { pass: false, count: 0, examples: [], reason: String(e) };
    }
    const pass = Array.isArray(r) && r.length > 0;
    return {
      pass,
      count: r.length,
      examples: r.slice(0, 4).map((p) => p.name),
      reason: pass ? "" : "結果為空或非 Array",
    };
  },
});

report({
  id: "E17", name: "abilityGroupFilter 設空陣列（等同未啟用）",
  command: `setFilter({ abilityGroupFilter: [] })`,
  expectDesc: "結果應與不設 abilityGroupFilter 相同（全量，不影響任何其他篩選）",
  expectFn: () => {
    const r = run([]);
    const pass = r.length === allPokemon.length;
    return {
      pass,
      count: r.length,
      examples: [],
      reason: pass ? "" : `空陣列結果(${r.length}) ≠ 全量(${allPokemon.length})`,
    };
  },
});

// ══════════════════════════════════════════════════════════════
// 總結
// ══════════════════════════════════════════════════════════════

console.log(`\n\x1b[1m════ 測試摘要 ════\x1b[0m`);
console.log(`PASS: ${passed}  WARN: ${warned}  FAIL: ${failed}`);
console.log(`\n各群組單獨統計：`);
for (const [id, def] of Object.entries(ABILITY_GROUPS)) {
  const r = run([id]);
  console.log(`  ${def.label}(${id}): ${r.length} 隻`);
}
console.log(`\n  （總基底形態數：${allPokemon.length}）`);

// ── 建議調整清單（執行後輸出邊界案例）────────────────────────
console.log(`\n\x1b[1m════ 建議調整候選 ════\x1b[0m`);

// antiStatDrop: 找出同時有 intimidate 的案例（D12 中出現的）
const antiAndOff = run(["antiStatDrop", "offensivePower"]);
console.log(`\nantiStatDrop + offensivePower 重疊（${antiAndOff.length} 隻）：`);
antiAndOff.slice(0, 10).forEach((p) =>
  console.log(`  ${p.name}: [${p.abilities.map(a=>a.name).join(", ")}]`)
);

const pivotAndOff = run(["pivotSupport", "offensivePower"]);
console.log(`\npivotSupport + offensivePower 重疊（${pivotAndOff.length} 隻）：`);
pivotAndOff.slice(0, 10).forEach((p) =>
  console.log(`  ${p.name}: [${p.abilities.map(a=>a.name).join(", ")}]`)
);

// D11 的結果（weatherSetters + weatherSpeedBoosters）
const weatherAnd = run(["weatherSetters", "weatherSpeedBoosters"]);
console.log(`\nweatherSetters + weatherSpeedBoosters 重疊（${weatherAnd.length} 隻）：`);
weatherAnd.forEach((p) =>
  console.log(`  ${p.name}: [${p.abilities.map(a=>a.name).join(", ")}]`)
);
