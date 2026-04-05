/**
 * Dev-only store bridge
 *
 * 將 PokemonStore 掛載到 window.__pokemonStore，供 browser console 驗證使用。
 * 僅在 import.meta.env.DEV === true 時生效，正式 build 為空操作。
 *
 * 使用方式：在 AppContent（已在 PokemonProvider 內部的元件）呼叫 useStoreBridge()。
 */

import { useEffect } from "react";
import { usePokemonStore, PokemonContextValue } from "../stores/usePokemonStore";

// ── window 型別擴充（dev only，不影響正式 build 的型別）──────
declare global {
  interface Window {
    __pokemonStore?: PokemonContextValue;
  }
}

const IS_DEV = import.meta.env.DEV;

export function useStoreBridge(): void {
  const store = usePokemonStore();

  useEffect(() => {
    if (!IS_DEV) return;

    window.__pokemonStore = store;

    // 只在首次掛載時提示，避免每次 render 都印
    if (!(window as { __storeBridgeReady?: boolean }).__storeBridgeReady) {
      (window as { __storeBridgeReady?: boolean }).__storeBridgeReady = true;
      console.info(
        "%c[StoreBridge] window.__pokemonStore 已就緒",
        "color: #60a5fa; font-weight: bold;"
      );
      console.info(
        "快速指令：\n" +
        "  讀取 filter   → window.__pokemonStore.filterState\n" +
        "  設 ability group → window.__pokemonStore.setFilter({ abilityGroupFilter: ['weatherSetters'] })\n" +
        "  清空所有篩選   → window.__pokemonStore.resetFilters()"
      );
    }

    // 每次 store reference 更新時同步，保持 console 拿到最新 filterState
    return () => {
      // 不清除 window.__pokemonStore，讓 console 可繼續使用
    };
  });
}
