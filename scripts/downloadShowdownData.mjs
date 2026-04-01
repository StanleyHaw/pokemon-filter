/**
 * 下載 Showdown 資料並儲存至 public/showdown/
 *
 * 資料來源：smogon/pokemon-showdown（jsDelivr CDN 鏡像）
 * 執行：node scripts/downloadShowdownData.mjs
 * 需求：Node.js 18+（原生 fetch）
 *
 * 說明：Showdown 資料為 TypeScript 格式（含 onHit 等函式），
 *       使用 Vite 內建的 esbuild 轉譯 TypeScript → JavaScript 再解析
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// public/ 目錄下的靜態資源由 Vite dev server 直接服務（/showdown/*.json）
const OUTPUT_DIR = join(__dirname, '../public/showdown');

// jsDelivr 是 GitHub 的可靠 CDN 鏡像
const CDN_BASE =
  'https://cdn.jsdelivr.net/gh/smogon/pokemon-showdown@master/data';

const SOURCES = [
  { filename: 'moves.json',     tsFile: 'moves.ts',     exportName: 'Moves'     },
  { filename: 'pokedex.json',   tsFile: 'pokedex.ts',   exportName: 'Pokedex'   },
  { filename: 'learnsets.json', tsFile: 'learnsets.ts', exportName: 'Learnsets' },
];

// ── TypeScript 轉譯 ──────────────────────────────────────────
/**
 * 用 esbuild（Vite 內建，無需額外安裝）將 TypeScript 轉為 JavaScript
 * 再用 Function() 執行取得物件
 */
async function transpileAndExtract(tsText, exportName) {
  // esbuild 是 Vite 的依賴，直接從 node_modules 引用
  const { transform } = await import('esbuild');

  // 1. TypeScript → JavaScript
  const { code: jsCode } = await transform(tsText, {
    loader: 'ts',
    target: 'es2020',
    // 不最小化，保持可讀性
    minify: false,
  });

  // 2. 替換 "export const ExportName = {" → "const __data = {"
  //    （esbuild 已移除型別標記，這裡只需去掉 export 關鍵字）
  const exportRe = new RegExp(
    `export\\s+const\\s+${exportName}\\s*=\\s*\\{`
  );
  if (!exportRe.test(jsCode)) {
    throw new Error(
      `esbuild 輸出中找不到 "export const ${exportName}"，請檢查資料格式`
    );
  }
  const runnable = jsCode.replace(exportRe, 'const __data = {');

  // 3. 執行並回傳
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${runnable}\nreturn __data;`);
  return fn();
}

// ── 只保留純資料欄位（篩選器不需要 onHit 等函式回調） ────────
/**
 * 遞迴過濾 moves 物件，移除所有 function 值
 * 我們只需要 num / type / category / basePower / flags 等純資料
 */
function stripFunctions(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'function') continue;          // 跳過 onHit / onTry 等
    if (typeof v === 'object' && v !== null) {
      result[k] = stripFunctions(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ── 下載與儲存 ────────────────────────────────────────────────
async function download({ filename, tsFile, exportName }) {
  console.log(`📥 下載 ${tsFile}...`);

  const url = `${CDN_BASE}/${tsFile}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  console.log(`   (${(text.length / 1024).toFixed(0)} KB) 轉譯中...`);

  const raw = await transpileAndExtract(text, exportName);
  const data = filename === 'moves.json' ? stripFunctions(raw) : raw;
  const count = Object.keys(data).length;

  writeFileSync(join(OUTPUT_DIR, filename), JSON.stringify(data), 'utf-8');
  console.log(`   ✅ ${filename} 完成（${count} 筆）\n`);
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📂 輸出目錄：${OUTPUT_DIR}\n`);

  const failed = [];
  for (const source of SOURCES) {
    try {
      await download(source);
    } catch (err) {
      console.error(`   ❌ ${source.filename} 失敗：${err.message}\n`);
      failed.push(source.filename);
    }
  }

  if (failed.length > 0) {
    console.error(`⚠️  下列檔案處理失敗：${failed.join(', ')}`);
    process.exit(1);
  }

  console.log('🎉 Showdown 資料下載完成！');
  console.log('   下一步：npm run dev，點擊「🛠 除錯」tab 驗證結果');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
