import { createContext, useContext, useReducer, useCallback, ReactNode, createElement } from "react";
import { MoveDetail } from "../types/pokemon";
import { fetchMove, fetchMoveList, fetchMovesByType, getNameTw, extractIdFromUrl } from "../services/pokeapi";
import { putMove, putMoveBatch, getMoveByName, getAllMoves } from "../db/pokemonDB";

interface MoveState {
  searchName: string;
  selectedCategory: string;
  selectedType: string;
  selectedDamageClass: string;
  results: MoveDetail[];
  isSearching: boolean;
  selectedMove: MoveDetail | null;
  error: string | null;
}

type Action =
  | { type: "SET_SEARCH_NAME"; payload: string }
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "SET_TYPE"; payload: string }
  | { type: "SET_DAMAGE_CLASS"; payload: string }
  | { type: "SET_RESULTS"; payload: MoveDetail[] }
  | { type: "SET_SEARCHING"; payload: boolean }
  | { type: "SELECT_MOVE"; payload: MoveDetail | null }
  | { type: "SET_ERROR"; payload: string | null };

function reducer(state: MoveState, action: Action): MoveState {
  switch (action.type) {
    case "SET_SEARCH_NAME": return { ...state, searchName: action.payload };
    case "SET_CATEGORY": return { ...state, selectedCategory: action.payload };
    case "SET_TYPE": return { ...state, selectedType: action.payload };
    case "SET_DAMAGE_CLASS": return { ...state, selectedDamageClass: action.payload };
    case "SET_RESULTS": return { ...state, results: action.payload };
    case "SET_SEARCHING": return { ...state, isSearching: action.payload };
    case "SELECT_MOVE": return { ...state, selectedMove: action.payload };
    case "SET_ERROR": return { ...state, error: action.payload };
    default: return state;
  }
}

const initialState: MoveState = {
  searchName: "",
  selectedCategory: "",
  selectedType: "",
  selectedDamageClass: "",
  results: [],
  isSearching: false,
  selectedMove: null,
  error: null,
};

async function transformMove(raw: Awaited<ReturnType<typeof fetchMove>>): Promise<MoveDetail> {
  // Fetch nameTw for all learner Pokémon from cached data
  const learnedByPokemon = raw.learned_by_pokemon.map((p) => ({
    name: p.name,
    id: extractIdFromUrl(p.url),
    nameTw: p.name, // Will be resolved from cached pokemon data
  }));

  return {
    id: raw.id,
    name: raw.name,
    nameTw: getNameTw(raw.names) || raw.name,
    type: raw.type.name,
    damageClass: raw.damage_class.name as MoveDetail["damageClass"],
    category: raw.meta?.category?.name ?? "unique",
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
    priority: raw.priority,
    effect: raw.effect_entries.find((e) => e.language.name === "zh-Hant")?.short_effect
      || raw.effect_entries.find((e) => e.language.name === "en")?.short_effect
      || "",
    target: raw.target?.name ?? "",
    learnedByPokemon,
  };
}

interface MoveContextValue extends MoveState {
  setSearchName: (name: string) => void;
  setCategory: (cat: string) => void;
  setType: (type: string) => void;
  setDamageClass: (dc: string) => void;
  selectMove: (move: MoveDetail | null) => void;
  search: () => Promise<void>;
  clearResults: () => void;
}

const MoveContext = createContext<MoveContextValue | null>(null);

export function MoveProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setSearchName = useCallback((name: string) => dispatch({ type: "SET_SEARCH_NAME", payload: name }), []);
  const setCategory = useCallback((cat: string) => dispatch({ type: "SET_CATEGORY", payload: cat }), []);
  const setType = useCallback((type: string) => dispatch({ type: "SET_TYPE", payload: type }), []);
  const setDamageClass = useCallback((dc: string) => dispatch({ type: "SET_DAMAGE_CLASS", payload: dc }), []);
  const selectMove = useCallback((move: MoveDetail | null) => dispatch({ type: "SELECT_MOVE", payload: move }), []);

  const clearResults = useCallback(() => {
    dispatch({ type: "SET_RESULTS", payload: [] });
    dispatch({ type: "SELECT_MOVE", payload: null });
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const search = useCallback(async () => {
    const { searchName, selectedCategory, selectedType, selectedDamageClass } = state;
    dispatch({ type: "SET_SEARCHING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_RESULTS", payload: [] });

    try {
      if (searchName.trim()) {
        // Search by name - check cache first
        const cached = await getMoveByName(searchName.toLowerCase().trim().replace(/\s+/g, "-"));
        if (cached) {
          dispatch({ type: "SET_RESULTS", payload: [cached] });
        } else {
          const raw = await fetchMove(searchName.toLowerCase().trim().replace(/\s+/g, "-"));
          const move = await transformMove(raw);
          await putMove(move);
          dispatch({ type: "SET_RESULTS", payload: [move] });
        }
      } else if (selectedType && !selectedCategory && !selectedDamageClass) {
        // Search by type (efficient: single API call)
        const moveRefs = await fetchMovesByType(selectedType);
        const MAX = 50;
        const toFetch = moveRefs.slice(0, MAX);

        const cachedMoves = await getAllMoves();
        const cachedByName = new Map(cachedMoves.map((m) => [m.name, m]));

        const results: MoveDetail[] = [];
        const toFetchFromAPI: typeof toFetch = [];

        for (const ref of toFetch) {
          const cached = cachedByName.get(ref.name);
          if (cached) results.push(cached);
          else toFetchFromAPI.push(ref);
        }

        // Batch fetch remaining
        for (let i = 0; i < toFetchFromAPI.length; i += 10) {
          const batch = toFetchFromAPI.slice(i, i + 10);
          const raws = await Promise.allSettled(batch.map((r) => fetchMove(r.name)));
          const moves: MoveDetail[] = [];
          for (const r of raws) {
            if (r.status === "fulfilled") {
              const m = await transformMove(r.value);
              moves.push(m);
            }
          }
          await putMoveBatch(moves);
          results.push(...moves);
        }

        let filtered = results;
        if (selectedCategory) filtered = filtered.filter((m) => m.category === selectedCategory);
        if (selectedDamageClass) filtered = filtered.filter((m) => m.damageClass === selectedDamageClass);

        dispatch({ type: "SET_RESULTS", payload: filtered });
      } else {
        // Filter by category and/or damage class - need to scan move list
        const allMoveList = await fetchMoveList(937);
        const cachedMoves = await getAllMoves();
        const cachedByName = new Map(cachedMoves.map((m) => [m.name, m]));

        // First use cached moves to filter
        const cachedFiltered = cachedMoves.filter((m) => {
          if (selectedCategory && m.category !== selectedCategory) return false;
          if (selectedDamageClass && m.damageClass !== selectedDamageClass) return false;
          if (selectedType && m.type !== selectedType) return false;
          return true;
        });

        if (cachedFiltered.length >= 20) {
          dispatch({ type: "SET_RESULTS", payload: cachedFiltered.slice(0, 50) });
        } else {
          // Need to fetch more - fetch in batches and filter
          const results = [...cachedFiltered];
          const toCheck = allMoveList.filter((r) => !cachedByName.has(r.name));

          for (let i = 0; i < Math.min(toCheck.length, 200); i += 10) {
            const batch = toCheck.slice(i, i + 10);
            const raws = await Promise.allSettled(batch.map((r) => fetchMove(r.name)));
            const moves: MoveDetail[] = [];
            for (const r of raws) {
              if (r.status === "fulfilled") {
                const m = await transformMove(r.value);
                moves.push(m);
              }
            }
            await putMoveBatch(moves);

            const matching = moves.filter((m) => {
              if (selectedCategory && m.category !== selectedCategory) return false;
              if (selectedDamageClass && m.damageClass !== selectedDamageClass) return false;
              if (selectedType && m.type !== selectedType) return false;
              return true;
            });
            results.push(...matching);

            if (results.length >= 50) break;
          }

          dispatch({ type: "SET_RESULTS", payload: results.slice(0, 50) });
        }
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: `搜尋失敗：${err instanceof Error ? err.message : "未知錯誤"}` });
    } finally {
      dispatch({ type: "SET_SEARCHING", payload: false });
    }
  }, [state]);

  const value: MoveContextValue = {
    ...state,
    setSearchName,
    setCategory,
    setType,
    setDamageClass,
    selectMove,
    search,
    clearResults,
  };

  return createElement(MoveContext.Provider, { value }, children);
}

export function useMoveStore(): MoveContextValue {
  const ctx = useContext(MoveContext);
  if (!ctx) throw new Error("useMoveStore must be used within MoveProvider");
  return ctx;
}
