import { createContext, useContext, useReducer, useCallback, ReactNode, createElement, useEffect, useRef } from "react";
import { PokemonSummary, FilterState, SortConfig, StatKey, TypeFilterMode, EvolutionCategory, TriState, MoveDetail, MoveTags, MoveGroupId, TacticalMoveFilters } from "../types/pokemon";
import { DEFAULT_STAT_RANGES } from "../constants/stats";
import { LoadingState, initializeData } from "../services/dataLoader";
import { MoveLoadingState, initializeMoveData } from "../services/moveLoader";

interface PokemonState {
  allPokemon: PokemonSummary[];
  loadingState: LoadingState;
  loadingProgress: number;
  loadingTotal: number;
  moveLoadingState: MoveLoadingState;
  moveLoadingProgress: number;
  moveLoadingTotal: number;
  filterState: FilterState;
  sortConfig: SortConfig;
}

type Action =
  | { type: "SET_POKEMON"; payload: PokemonSummary[] }
  | { type: "SET_LOADING_STATE"; payload: LoadingState }
  | { type: "SET_PROGRESS"; payload: { loaded: number; total: number } }
  | { type: "SET_MOVE_LOADING_STATE"; payload: MoveLoadingState }
  | { type: "SET_MOVE_PROGRESS"; payload: { loaded: number; total: number } }
  | { type: "SET_FILTER"; payload: Partial<FilterState> }
  | { type: "SET_SORT"; payload: SortConfig }
  | { type: "RESET_FILTERS" };

const defaultTacticalMoveFilters: TacticalMoveFilters = {
  damageClass: '',
  type: '',
  powerMin: 0,
  powerMax: 250,
  accuracyMin: 0,
  accuracyMax: 100,
};

const defaultFilter: FilterState = {
  statRanges: { ...DEFAULT_STAT_RANGES },
  types: [],
  typeFilterMode: "intersection",
  generations: [],
  searchText: "",
  restrictedFilter: null,
  unrestrictedFilter: null,
  mythicalFilter: null,
  evolutionFilter: {},
  abilityFilter: [] as string[],
  singleTypeOnly: false,
  dualTypeOnly: false,
  moveFilter: [] as MoveDetail[],
  moveTagFilter: [] as (keyof MoveTags)[],
  moveGroupFilter: [] as MoveGroupId[],
  tacticalMoveFilters: { ...defaultTacticalMoveFilters },
};

function reducer(state: PokemonState, action: Action): PokemonState {
  switch (action.type) {
    case "SET_POKEMON":
      return { ...state, allPokemon: action.payload };
    case "SET_LOADING_STATE":
      return { ...state, loadingState: action.payload };
    case "SET_PROGRESS":
      return {
        ...state,
        loadingProgress: action.payload.loaded,
        loadingTotal: action.payload.total,
      };
    case "SET_MOVE_LOADING_STATE":
      return { ...state, moveLoadingState: action.payload };
    case "SET_MOVE_PROGRESS":
      return {
        ...state,
        moveLoadingProgress: action.payload.loaded,
        moveLoadingTotal: action.payload.total,
      };
    case "SET_FILTER":
      return { ...state, filterState: { ...state.filterState, ...action.payload } };
    case "SET_SORT":
      return { ...state, sortConfig: action.payload };
    case "RESET_FILTERS":
      return { ...state, filterState: { ...defaultFilter } };
    default:
      return state;
  }
}

const initialState: PokemonState = {
  allPokemon: [],
  loadingState: "idle",
  loadingProgress: 0,
  loadingTotal: 1302,
  moveLoadingState: "idle",
  moveLoadingProgress: 0,
  moveLoadingTotal: 0,
  filterState: defaultFilter,
  sortConfig: { key: "id", direction: "asc" },
};

export interface PokemonContextValue extends PokemonState {
  setFilter: (partial: Partial<FilterState>) => void;
  setSort: (key: SortConfig["key"], direction: SortConfig["direction"]) => void;
  resetFilters: () => void;
  setStatRange: (stat: StatKey, range: [number, number]) => void;
  toggleType: (type: string) => void;
  toggleGeneration: (gen: number) => void;
  setTypeFilterMode: (mode: TypeFilterMode) => void;
  setEvolutionFilterItem: (cat: EvolutionCategory, state: TriState) => void;
  toggleAbilityFilter: (name: string) => void;
  toggleMoveFilter: (move: MoveDetail) => void;
  toggleMoveTagFilter: (tag: keyof MoveTags) => void;
  toggleMoveGroupFilter: (groupId: MoveGroupId) => void;
  setTacticalMoveFilter: (partial: Partial<TacticalMoveFilters>) => void;
  resetTacticalMoveFilters: () => void;
}

const PokemonContext = createContext<PokemonContextValue | null>(null);

export function PokemonProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initializeData({
      onProgress: (loaded, total) => {
        dispatch({ type: "SET_PROGRESS", payload: { loaded, total } });
      },
      onPartialReady: (pokemon) => {
        dispatch({ type: "SET_POKEMON", payload: pokemon });
      },
      onComplete: (pokemon) => {
        dispatch({ type: "SET_POKEMON", payload: pokemon });
      },
      onError: (err) => {
        console.error("Data loading error:", err);
      },
      onStateChange: (s) => {
        dispatch({ type: "SET_LOADING_STATE", payload: s });
      },
    });

    initializeMoveData({
      onProgress: (loaded, total) => {
        dispatch({ type: "SET_MOVE_PROGRESS", payload: { loaded, total } });
      },
      onComplete: () => {
        dispatch({ type: "SET_MOVE_LOADING_STATE", payload: "complete" });
      },
      onError: (err) => {
        console.error("Move loading error:", err);
        dispatch({ type: "SET_MOVE_LOADING_STATE", payload: "error" });
      },
      onStateChange: (s) => {
        dispatch({ type: "SET_MOVE_LOADING_STATE", payload: s });
      },
    });
  }, []);

  const setFilter = useCallback((partial: Partial<FilterState>) => {
    dispatch({ type: "SET_FILTER", payload: partial });
  }, []);

  const setSort = useCallback((key: SortConfig["key"], direction: SortConfig["direction"]) => {
    dispatch({ type: "SET_SORT", payload: { key, direction } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const setStatRange = useCallback((stat: StatKey, range: [number, number]) => {
    dispatch({
      type: "SET_FILTER",
      payload: {
        statRanges: { ...state.filterState.statRanges, [stat]: range },
      },
    });
  }, [state.filterState.statRanges]);

  const toggleType = useCallback((type: string) => {
    const current = state.filterState.types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    dispatch({ type: "SET_FILTER", payload: { types: next } });
  }, [state.filterState.types]);

  const toggleGeneration = useCallback((gen: number) => {
    const current = state.filterState.generations;
    const next = current.includes(gen)
      ? current.filter((g) => g !== gen)
      : [...current, gen];
    dispatch({ type: "SET_FILTER", payload: { generations: next } });
  }, [state.filterState.generations]);

  const setTypeFilterMode = useCallback((mode: TypeFilterMode) => {
    dispatch({ type: "SET_FILTER", payload: { typeFilterMode: mode } });
  }, []);

  const setEvolutionFilterItem = useCallback((cat: EvolutionCategory, triState: TriState) => {
    dispatch({
      type: "SET_FILTER",
      payload: { evolutionFilter: { ...state.filterState.evolutionFilter, [cat]: triState } },
    });
  }, [state.filterState.evolutionFilter]);

  const toggleAbilityFilter = useCallback((name: string) => {
    const current = state.filterState.abilityFilter;
    const next = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    dispatch({ type: "SET_FILTER", payload: { abilityFilter: next } });
  }, [state.filterState.abilityFilter]);

  const toggleMoveFilter = useCallback((move: MoveDetail) => {
    const current = state.filterState.moveFilter;
    const exists = current.some((m) => m.name === move.name);
    const next = exists ? current.filter((m) => m.name !== move.name) : [...current, move];
    dispatch({ type: "SET_FILTER", payload: { moveFilter: next } });
  }, [state.filterState.moveFilter]);

  const toggleMoveTagFilter = useCallback((tag: keyof MoveTags) => {
    const current = state.filterState.moveTagFilter;
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    dispatch({ type: "SET_FILTER", payload: { moveTagFilter: next } });
  }, [state.filterState.moveTagFilter]);

  const toggleMoveGroupFilter = useCallback((groupId: MoveGroupId) => {
    const current = state.filterState.moveGroupFilter;
    const next = current.includes(groupId) ? current.filter((g) => g !== groupId) : [...current, groupId];
    dispatch({ type: "SET_FILTER", payload: { moveGroupFilter: next } });
  }, [state.filterState.moveGroupFilter]);

  const setTacticalMoveFilter = useCallback((partial: Partial<TacticalMoveFilters>) => {
    dispatch({ type: "SET_FILTER", payload: { tacticalMoveFilters: { ...state.filterState.tacticalMoveFilters, ...partial } } });
  }, [state.filterState.tacticalMoveFilters]);

  const resetTacticalMoveFilters = useCallback(() => {
    dispatch({ type: "SET_FILTER", payload: { tacticalMoveFilters: { ...defaultTacticalMoveFilters } } });
  }, []);

  const value: PokemonContextValue = {
    ...state,
    setFilter,
    setSort,
    resetFilters,
    setStatRange,
    toggleType,
    toggleGeneration,
    setTypeFilterMode,
    setEvolutionFilterItem,
    toggleAbilityFilter,
    toggleMoveFilter,
    toggleMoveTagFilter,
    toggleMoveGroupFilter,
    setTacticalMoveFilter,
    resetTacticalMoveFilters,
  };

  return createElement(PokemonContext.Provider, { value }, children);
}

export function usePokemonStore(): PokemonContextValue {
  const ctx = useContext(PokemonContext);
  if (!ctx) throw new Error("usePokemonStore must be used within PokemonProvider");
  return ctx;
}
