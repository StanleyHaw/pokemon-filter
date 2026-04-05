/**
 * Showdown 資料的 React Context
 *
 * 職責：
 *   - 在 app 啟動時從 /showdown/*.json 取得資料
 *   - 正規化 moves / species / learnsets
 *   - 建立 LearnsetIndex 供 useFilteredPokemon 使用
 *   - 暴露 loading 狀態，允許 UI 優雅降級
 *
 * 前置作業：
 *   執行 `node scripts/downloadShowdownData.mjs` 下載資料到 public/showdown/
 *   若檔案不存在，store 會進入 "unavailable" 狀態，篩選器自動退回 PokéAPI 模式
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  createElement,
} from "react";
import type { ShowdownMovesData } from "../types/move";
import type { ShowdownPokedexData } from "../types/species";
import type { ShowdownLearnsetsData } from "../types/learnset";
import type { NormalizedMove } from "../types/move";
import type { NormalizedSpecies } from "../types/species";
import type { LearnsetIndex } from "../types/learnset";
import { normalizeMoves } from "../lib/showdown/normalizeMoves";
import { normalizePokedex } from "../lib/showdown/normalizeSpecies";
import { buildLearnsetIndex } from "../lib/showdown/normalizeLearnset";
import { buildSpeciesLearnsetMap } from "../lib/showdown/showdownId";
import { MOVE_NAMES_TW } from "../constants/moveNamesCn";

// MOVE_NAMES_TW 格式：{ showdownId: "繁體中文名" }，可直接傳給 normalizeMoves

export type ShowdownStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unavailable"  // 檔案不存在，已優雅降級
  | "error";

interface ShowdownState {
  status: ShowdownStatus;
  moves: Record<string, NormalizedMove>;
  species: Record<string, NormalizedSpecies>;
  learnsetIndex: LearnsetIndex | null;
  /** speciesShowdownId → learnsetId，供 useFilteredPokemon 快速查詢 */
  speciesLearnsetMap: Map<string, string>;
  error?: string;
}

const initialState: ShowdownState = {
  status: "idle",
  moves: {},
  species: {},
  learnsetIndex: null,
  speciesLearnsetMap: new Map(),
};

const ShowdownContext = createContext<ShowdownState | null>(null);

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export function ShowdownProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShowdownState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, status: "loading" }));

      try {
        // import.meta.env.BASE_URL 會套用 vite.config.ts 的 base 設定
        // e.g. base: '/pokemon-filter/' → '/pokemon-filter/showdown/moves.json'
        const base = import.meta.env.BASE_URL;
        const [rawMoves, rawPokedex, rawLearnsets] = await Promise.all([
          fetchJson<ShowdownMovesData>(`${base}showdown/moves.json`),
          fetchJson<ShowdownPokedexData>(`${base}showdown/pokedex.json`),
          fetchJson<ShowdownLearnsetsData>(`${base}showdown/learnsets.json`),
        ]);

        if (cancelled) return;

        // 正規化（同步，但資料量大時約需 100–300ms）
        const moves = normalizeMoves(rawMoves, MOVE_NAMES_TW, { excludePast: true });
        const species = normalizePokedex(rawPokedex, {}, { excludePast: true });

        // 建立 learnset 雙向索引（只納入第 9 世代，競技篩選用）
        // 若需要歷代資料可改 minGen: 1
        const learnsetIndex = buildLearnsetIndex(rawLearnsets, 9);

        const speciesLearnsetMap = buildSpeciesLearnsetMap(species);

        if (cancelled) return;

        setState({
          status: "ready",
          moves,
          species,
          learnsetIndex,
          speciesLearnsetMap,
        });

        if (import.meta.env.DEV) {
          console.log(
            `[ShowdownStore] 載入完成｜招式: ${Object.keys(moves).length}｜` +
            `種族: ${Object.keys(species).length}｜` +
            `Learnset 種族數: ${learnsetIndex.bySpecies.size}`
          );
        }
      } catch (err) {
        if (cancelled) return;

        const isNotFound =
          err instanceof Error && err.message.startsWith("HTTP 404");

        // 404 = 檔案未下載，優雅降級
        if (isNotFound) {
          console.warn(
            "[ShowdownStore] Showdown 資料未找到（/showdown/*.json）。\n" +
            "執行 `node scripts/downloadShowdownData.mjs` 後重整頁面。\n" +
            "目前使用 PokéAPI 資料繼續運行。"
          );
          setState((s) => ({ ...s, status: "unavailable" }));
        } else {
          console.error("[ShowdownStore] 載入失敗：", err);
          setState((s) => ({
            ...s,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return createElement(ShowdownContext.Provider, { value: state }, children);
}

export function useShowdownStore(): ShowdownState {
  const ctx = useContext(ShowdownContext);
  // ShowdownProvider 可選 — 若未包裹則回傳空狀態（安全降級）
  if (!ctx) return initialState;
  return ctx;
}
