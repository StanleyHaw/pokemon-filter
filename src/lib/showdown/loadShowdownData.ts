/**
 * Showdown 資料載入與初始化管理
 *
 * 使用方式（兩種方案擇一）：
 *
 * ── 方案 A：靜態 JSON 匯入（推薦，適合 Vite 專案）──────────────
 *   1. 執行下載腳本：node scripts/downloadShowdownData.mjs
 *   2. 在 App 初始化時呼叫：
 *
 *      import movesData from '../data/showdown/moves.json';
 *      import pokedexData from '../data/showdown/pokedex.json';
 *      import learnsetsData from '../data/showdown/learnsets.json';
 *      import { initShowdownData } from './lib/showdown/loadShowdownData';
 *
 *      initShowdownData({ moves: movesData, pokedex: pokedexData, learnsets: learnsetsData });
 *
 * ── 方案 B：執行時 fetch（適合 CDN 或不想打包資料的情況）──────────
 *      import { loadShowdownDataFromCDN } from './lib/showdown/loadShowdownData';
 *      await loadShowdownDataFromCDN();
 */

import type { ShowdownMovesData } from "../../types/move";
import type { ShowdownPokedexData } from "../../types/species";
import type { ShowdownLearnsetsData } from "../../types/learnset";

export interface ShowdownDataBundle {
  moves: ShowdownMovesData;
  pokedex: ShowdownPokedexData;
  learnsets: ShowdownLearnsetsData;
}

/** 記憶體快取 — 只需初始化一次 */
let cachedBundle: ShowdownDataBundle | null = null;

/**
 * 手動注入 Showdown 資料（方案 A：靜態 import 後呼叫此函式）
 */
export function initShowdownData(bundle: ShowdownDataBundle): void {
  cachedBundle = bundle;
}

/**
 * 取得已初始化的資料包
 * 若尚未初始化則拋出錯誤
 */
export function getShowdownData(): ShowdownDataBundle {
  if (!cachedBundle) {
    throw new Error(
      "[loadShowdownData] Showdown 資料尚未初始化。\n" +
        "請先呼叫 initShowdownData() 或 loadShowdownDataFromCDN()。"
    );
  }
  return cachedBundle;
}

/** 是否已完成初始化 */
export function isShowdownDataReady(): boolean {
  return cachedBundle !== null;
}

// ── CDN Fetch（方案 B）──────────────────────────────────────

/**
 * Showdown 資料的 CDN 來源設定
 *
 * 預設使用 @pkmn/data 的 GitHub Pages 靜態 JSON。
 * 若需自行 host，可在呼叫時傳入 baseUrl 覆蓋。
 *
 * 注意：Showdown 官方 GitHub 的資料為 .ts 格式，無法直接 fetch。
 * 此處預設使用已轉換為 JSON 的映像來源。
 */
const DEFAULT_CDN_BASE =
  "https://raw.githubusercontent.com/pkmn/ps/main/data";

export interface FetchOptions {
  baseUrl?: string;
  /** 是否在 fetch 失敗時拋出錯誤（預設 true） */
  throwOnError?: boolean;
  /** 傳入 fetch 的 RequestInit 設定 */
  fetchInit?: RequestInit;
}

async function fetchJson<T>(url: string, fetchInit?: RequestInit): Promise<T> {
  const res = await fetch(url, fetchInit);
  if (!res.ok) {
    throw new Error(`[loadShowdownData] Fetch 失敗：${res.status} ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * 從 CDN 非同步載入 Showdown 資料並初始化
 *
 * @param options.baseUrl 自訂 CDN 根路徑
 */
export async function loadShowdownDataFromCDN(
  options: FetchOptions = {}
): Promise<ShowdownDataBundle> {
  const {
    baseUrl = DEFAULT_CDN_BASE,
    throwOnError = true,
    fetchInit,
  } = options;

  try {
    const [moves, pokedex, learnsets] = await Promise.all([
      fetchJson<ShowdownMovesData>(`${baseUrl}/moves.json`, fetchInit),
      fetchJson<ShowdownPokedexData>(`${baseUrl}/pokedex.json`, fetchInit),
      fetchJson<ShowdownLearnsetsData>(`${baseUrl}/learnsets.json`, fetchInit),
    ]);

    const bundle: ShowdownDataBundle = { moves, pokedex, learnsets };
    initShowdownData(bundle);
    return bundle;
  } catch (err) {
    if (throwOnError) throw err;
    console.error("[loadShowdownData]", err);
    throw err;
  }
}
