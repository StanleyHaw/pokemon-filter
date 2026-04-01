/**
 * Learnset Mapping Audit（開發用）
 *
 * 掃描 PokéAPI 實際載入的 Pokémon 清單，逐一驗證
 * PokéAPI 名稱 → Showdown learnset ID 的對應是否成功。
 *
 * 用途：快速找出類似 Squawkabilly 的 key 對不上問題，
 *       不需要全面人工盤點，執行一次即可取得摘要。
 *
 * 執行：node scripts/auditLearnsetMapping.mjs
 * 需求：Node.js 18+（原生 fetch）、public/showdown/learnsets.json 已存在
 *
 * ──────────────────────────────────────────────────────────────
 * 輸出格式
 * ──────────────────────────────────────────────────────────────
 * [exact]         → toShowdownId(name) 直接命中
 * [form-override] → POKEAPI_FORM_OVERRIDES 精確映射命中
 * [suffix-strip]  → 後綴剝離後退回基底種族命中
 * [unresolved]    → 無法命中 learnset（需關注）
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── 1. 載入 Showdown learnset index ──────────────────────────

const rawLearnsets = JSON.parse(
  readFileSync(join(ROOT, 'public/showdown/learnsets.json'), 'utf8')
);

// bySpecies: 只需要 key set（Gen 9 限制對 audit 無意義，這裡取全部 key）
const bySpecies = new Set(
  Object.entries(rawLearnsets)
    .filter(([, v]) => v.learnset && Object.keys(v.learnset).length > 0)
    .map(([k]) => k)
);

// ── 2. 複製 showdownId.ts 的解析邏輯（需與主程式同步）───────

function toShowdownId(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 同步自 src/lib/showdown/showdownId.ts
const POKEAPI_FORM_OVERRIDES = {
  squawkabillygreenplumage: 'squawkabilly',
  squawkabillyblueplumage: 'squawkabilly',
  squawkabillyyellowplumage: 'squawkabilly',
  squawkabillywhiteplumage: 'squawkabilly',
};

const FORM_SUFFIXES = [
  'megax', 'megay', 'mega',
  'primal',
  'gmax',
  'alolan', 'alola',
  'galarian', 'galar',
  'hisuian', 'hisui',
  'paldean', 'paldea',
  'origin', 'therian', 'black', 'white', 'resolute',
  'totem',
];

/**
 * @returns { resolvedId: string, method: 'exact'|'form-override'|'suffix-strip'|'unresolved' }
 */
function resolveWithMethod(pokemonName) {
  const exact = toShowdownId(pokemonName);

  if (bySpecies.has(exact)) {
    return { resolvedId: exact, method: 'exact' };
  }

  const formOverride = POKEAPI_FORM_OVERRIDES[exact];
  if (formOverride && bySpecies.has(formOverride)) {
    return { resolvedId: formOverride, method: 'form-override' };
  }

  for (const suffix of FORM_SUFFIXES) {
    if (exact.endsWith(suffix)) {
      const base = exact.slice(0, exact.length - suffix.length);
      if (base.length > 0 && bySpecies.has(base)) {
        return { resolvedId: base, method: 'suffix-strip' };
      }
    }
  }

  return { resolvedId: exact, method: 'unresolved' };
}

// ── 3. 複製 dataLoader.ts 的 shouldIncludeForm 邏輯 ─────────
// （需與主程式同步，否則 audit 結果與實際載入不符）

const SKIP_PREFIXES = [
  'pikachu-', 'unown-', 'alcremie-', 'vivillon-', 'furfrou-',
  'minior-', 'flabebe-', 'floette-', 'florges-',
];

const SKIP_CONTAINS = [
  '-totem', '-cap', '-partner', '-gmax', '-spiky', '-starter', '-mega', '-primal',
];

const SKIP_FORM_EXACT = new Set([
  'mimikyu-busted', 'maushold-family-of-three', 'dudunsparce-three-segment',
  'keldeo-resolute', 'greninja-battle-bond', 'zarude-dada',
  'squawkabilly-blue-plumage', 'squawkabilly-yellow-plumage', 'squawkabilly-white-plumage',
  'magearna-original', 'eternatus-eternamax',
]);

const FORCE_INCLUDE_NAMES = new Set(['minior-red']);

function shouldIncludeForm(name, isDefault) {
  if (isDefault) return true;
  if (FORCE_INCLUDE_NAMES.has(name)) return true;
  if (SKIP_FORM_EXACT.has(name)) return false;
  if (SKIP_PREFIXES.some((p) => name.startsWith(p))) return false;
  if (SKIP_CONTAINS.some((s) => name.includes(s))) return false;
  return true;
}

// ── 4. 取得 PokéAPI Pokémon 清單 ─────────────────────────────

console.log('📡 正在向 PokéAPI 取得 Pokémon 清單...');
const listRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1350');
if (!listRes.ok) throw new Error(`PokéAPI 清單取得失敗：${listRes.status}`);
const listData = await listRes.json();
const allEntries = listData.results; // [{ name, url }]

// 取得每個 Pokémon 的 is_default 狀態需要個別 fetch，
// 但為了不發出 1350 個請求，改用近似策略：
//   - ID <= 1025 的視為 default（國際圖鑑號）
//   - ID > 1025 的為 alternate form，靠名稱規則判斷是否 include
function extractIdFromUrl(url) {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

const included = allEntries.filter((entry) => {
  const id = extractIdFromUrl(entry.url);
  const isDefault = id <= 1025;
  return shouldIncludeForm(entry.name, isDefault);
});

// ── 5. 逐一解析並分類 ─────────────────────────────────────────

const results = { exact: [], 'form-override': [], 'suffix-strip': [], unresolved: [] };

for (const entry of included) {
  const { resolvedId, method } = resolveWithMethod(entry.name);
  results[method].push({
    name: entry.name,
    showdownId: toShowdownId(entry.name),
    resolvedId,
  });
}

// ── 6. 輸出報告 ───────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

const total = included.length;

console.log('\n' + c('bold', '══════════════════════════════════════════'));
console.log(c('bold', '  Learnset Mapping Audit'));
console.log(c('bold', '══════════════════════════════════════════'));
console.log(`  總計納入 Pokémon：${total} 筆`);
console.log('');

// exact（只顯示數量）
console.log(c('green', `[exact]         ${results['exact'].length} 筆`) + c('dim', '（直接命中，略去明細）'));

// form-override
console.log(c('cyan', `[form-override]  ${results['form-override'].length} 筆`));
if (results['form-override'].length > 0) {
  for (const r of results['form-override']) {
    console.log(c('dim', `  ${r.name} → ${r.resolvedId}`));
  }
}

// suffix-strip
console.log(c('yellow', `[suffix-strip]  ${results['suffix-strip'].length} 筆`));
if (results['suffix-strip'].length > 0) {
  for (const r of results['suffix-strip']) {
    console.log(c('dim', `  ${r.name} → ${r.resolvedId}`));
  }
}

// unresolved（完整明細）
console.log(c('red', `[unresolved]    ${results['unresolved'].length} 筆`) + (results['unresolved'].length > 0 ? c('red', ' ← 需關注') : ''));
if (results['unresolved'].length > 0) {
  for (const r of results['unresolved']) {
    console.log(c('red', `  ✗ ${r.name}`));
    console.log(c('dim', `    showdownId: ${r.showdownId}`));
    console.log(c('dim', `    learnset 中未找到任何對應`));
  }
}

// 摘要
console.log('');
console.log(c('bold', '── 摘要 ─────────────────────────────────'));
console.log(`  exact:         ${results['exact'].length} / ${total}`);
console.log(`  form-override: ${results['form-override'].length} / ${total}`);
console.log(`  suffix-strip:  ${results['suffix-strip'].length} / ${total}`);
console.log(`  unresolved:    ${results['unresolved'].length} / ${total}`);
console.log('');

if (results['unresolved'].length === 0) {
  console.log(c('green', '✅ 全部 Pokémon 均可成功對應 Showdown learnset'));
} else {
  console.log(c('yellow', '⚠️  上列 unresolved 項目在招式篩選時將永遠無法命中'));
  console.log(c('yellow', '   請逐一確認是否需要加入 POKEAPI_FORM_OVERRIDES'));
}
console.log('');
console.log(c('dim', '注意：unresolved 不代表資料錯誤，部分特殊形態確實無招式資料'));
console.log(c('dim', '      需人工判斷該形態是否預期要參與招式篩選'));
