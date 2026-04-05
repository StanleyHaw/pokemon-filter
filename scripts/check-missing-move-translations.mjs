#!/usr/bin/env node
/**
 * check-missing-move-translations.mjs
 *
 * 比對 public/showdown/moves.json 與 src/constants/moveNamesCn.ts，
 * 找出尚未有繁體中文翻譯的招式。
 *
 * 用法：
 *   node scripts/check-missing-move-translations.mjs          # 僅 console 輸出
 *   node scripts/check-missing-move-translations.mjs --json   # 另外輸出 JSON 檔
 *
 * 資料來源：
 *   - 招式資料：public/showdown/moves.json（與 normalizeMoves 使用同一份）
 *   - 翻譯表：src/constants/moveNamesCn.ts（解析 TypeScript 原始碼，取出所有 key）
 *
 * 篩選邏輯與 normalizeMoves({ excludePast: true }) 一致：
 *   - 排除 isNonstandard === "Past" 或 "Future"
 *   - 排除 isZ 或 isMax 招式
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. 讀取招式資料 ───────────────────────────────────────────────
const movesPath = resolve(ROOT, 'public/showdown/moves.json');
let rawMoves;
try {
  rawMoves = JSON.parse(readFileSync(movesPath, 'utf8'));
} catch {
  console.error('❌ 找不到 public/showdown/moves.json');
  console.error('   請先執行：node scripts/downloadShowdownData.mjs');
  process.exit(1);
}

// ── 2. 篩選有效招式（與 normalizeMoves excludePast:true 一致）────────
const validMoves = Object.entries(rawMoves).filter(([, data]) => {
  if (data.isNonstandard === 'Past' || data.isNonstandard === 'Future') return false;
  if (data.isZ) return false;
  if (data.isMax) return false;
  return true;
});

// ── 3. 從 moveNamesCn.ts 解析翻譯 key ────────────────────────────
const translationPath = resolve(ROOT, 'src/constants/moveNamesCn.ts');
const translationSource = readFileSync(translationPath, 'utf8');

// 匹配 key: "value" 格式（含引號 key 如 "10000000voltthunderbolt"）
// 只抓 a-z0-9 開頭的 key，避免誤抓 TS 關鍵字
const keyRegex = /^\s*(?:"([a-z0-9][^"]*?)"|([a-z][a-z0-9]*))\s*:/gm;
const translationKeys = new Set();
let match;
while ((match = keyRegex.exec(translationSource)) !== null) {
  translationKeys.add(match[1] ?? match[2]);
}

// ── 4. 找出缺翻譯 ─────────────────────────────────────────────────
const missing = validMoves
  .filter(([id]) => !translationKeys.has(id))
  .map(([id, data]) => ({
    showdownId: id,
    englishName: data.name ?? id,
    isNonstandard: data.isNonstandard ?? null,
  }))
  .sort((a, b) => a.showdownId.localeCompare(b.showdownId));

// ── 5. 輸出報告 ───────────────────────────────────────────────────
const total = validMoves.length;
const covered = total - missing.length;

console.log('\n📊 招式翻譯覆蓋率報告');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`總有效招式數：    ${total}`);
console.log(`已有中文翻譯：    ${covered}`);
console.log(`缺翻譯：          ${missing.length}`);
console.log(`覆蓋率：          ${((covered / total) * 100).toFixed(1)}%`);

if (missing.length > 0) {
  console.log('\n❌ 缺翻譯招式：');
  console.table(
    missing.map((m) => ({
      showdownId: m.showdownId,
      英文名: m.englishName,
      isNonstandard: m.isNonstandard ?? '—',
    }))
  );

  if (process.argv.includes('--json')) {
    const outPath = resolve(ROOT, 'scripts/missing-translations.json');
    writeFileSync(outPath, JSON.stringify(missing, null, 2), 'utf8');
    console.log(`\n✅ 已輸出：${outPath}`);
  }

  // 產生可貼入 MOVE_TW_MANUAL 的骨架（供手動補充）
  console.log('\n📋 可貼入 MOVE_TW_MANUAL 的骨架（請自行補上中文名）：');
  console.log('─────────────────────────────────────────────────');
  for (const m of missing) {
    console.log(`  ${m.showdownId}: "", // ${m.englishName}`);
  }
} else {
  console.log('\n✅ 所有有效招式均已有中文翻譯！');
}
