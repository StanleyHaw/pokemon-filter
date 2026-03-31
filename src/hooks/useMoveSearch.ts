import { useState, useEffect, useRef } from 'react';
import { MoveDetail } from '../types/pokemon';
import { getAllMoves, getMoveByName, putMove } from '../db/pokemonDB';
import { fetchMove, getNameTw, extractIdFromUrl } from '../services/pokeapi';
import { MOVE_NAMES_TW } from '../constants/moveNamesCn';

export interface MoveSearchFilters {
  damageClass: string;
  type: string;
  target: string;
  category: string;
  powerMin: number;
  powerMax: number;
  accuracyMin: number;
  accuracyMax: number;
}

export async function fetchAndCacheMove(name: string): Promise<MoveDetail | null> {
  const cached = await getMoveByName(name.toLowerCase().trim().replace(/\s+/g, '-'));
  if (cached) return cached;
  try {
    const raw = await fetchMove(name.toLowerCase().trim().replace(/\s+/g, '-'));
    const move: MoveDetail = {
      id: raw.id,
      name: raw.name,
      nameTw: getNameTw(raw.names) || raw.name,
      type: raw.type.name,
      damageClass: raw.damage_class.name as MoveDetail['damageClass'],
      category: raw.meta?.category?.name ?? 'unique',
      power: raw.power,
      accuracy: raw.accuracy,
      pp: raw.pp,
      priority: raw.priority,
      effect: raw.effect_entries.find((e) => e.language.name === 'zh-Hant')?.short_effect
        || raw.effect_entries.find((e) => e.language.name === 'en')?.short_effect
        || '',
      target: raw.target?.name ?? '',
      learnedByPokemon: raw.learned_by_pokemon.map((p) => ({
        name: p.name,
        id: extractIdFromUrl(p.url),
        nameTw: p.name,
      })),
    };
    await putMove(move);
    return move;
  } catch {
    return null;
  }
}

export function useMoveSearch(query: string, filters: MoveSearchFilters) {
  const [suggestions, setSuggestions] = useState<MoveDetail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const hasQuery = query.trim().length > 0;
    const hasFilter = !!(filters.damageClass || filters.type || filters.target || filters.category);

    if (!hasQuery && !hasFilter) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const allCached = await getAllMoves();
        const q = query.trim().toLowerCase();
        const qOrig = query.trim();

        const filtered = allCached.filter((m) => {
          if (hasQuery && !m.nameTw.includes(qOrig) && !m.name.includes(q)) return false;
          if (filters.damageClass && m.damageClass !== filters.damageClass) return false;
          if (filters.type && m.type !== filters.type) return false;
          if (filters.target && m.target !== filters.target) return false;
          if (filters.category && m.category !== filters.category) return false;
          if (filters.powerMin > 0 || filters.powerMax < 250) {
            if (m.power === null) return false;
            if (m.power < filters.powerMin || m.power > filters.powerMax) return false;
          }
          if (filters.accuracyMin > 0 || filters.accuracyMax < 100) {
            if (m.accuracy === null) return false;
            if (m.accuracy < filters.accuracyMin || m.accuracy > filters.accuracyMax) return false;
          }
          return true;
        }).slice(0, 8);

        // If DB cache returned fewer than 8 results and there's a text query,
        // supplement with static CN name map as placeholder suggestions
        if (hasQuery && filtered.length < 8) {
          const cachedSlugs = new Set(filtered.map((m) => m.name));
          const cnMatches = Object.entries(MOVE_NAMES_TW)
            .filter(([cnName, slug]) => cnName.includes(qOrig) && !cachedSlugs.has(slug))
            .slice(0, 8 - filtered.length)
            .map(([cnName, slug]): MoveDetail => ({
              id: 0,
              name: slug,
              nameTw: cnName,
              type: '',
              damageClass: 'physical',
              category: '',
              power: null,
              accuracy: null,
              pp: 0,
              priority: 0,
              effect: '',
              target: '',
              learnedByPokemon: [],
            }));
          setSuggestions([...filtered, ...cnMatches]);
        } else {
          setSuggestions(filtered);
        }
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filters.damageClass, filters.type, filters.target, filters.category, filters.powerMin, filters.powerMax, filters.accuracyMin, filters.accuracyMax]);

  return { suggestions, isSearching };
}
