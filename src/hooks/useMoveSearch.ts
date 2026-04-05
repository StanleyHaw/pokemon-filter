import { useState, useEffect, useRef } from 'react';
import { MoveDetail } from '../types/pokemon';
import { getAllMoves, getMoveByName, putMove } from '../db/pokemonDB';
import { fetchMove, getNameTw, extractIdFromUrl } from '../services/pokeapi';
import { MOVE_NAMES_TW } from '../constants/moveNamesCn';
import { toShowdownId } from '../lib/showdown/showdownId';

export async function fetchAndCacheMove(name: string): Promise<MoveDetail | null> {
  const cached = await getMoveByName(name.toLowerCase().trim().replace(/\s+/g, '-'));
  if (cached) return cached;
  try {
    const raw = await fetchMove(name.toLowerCase().trim().replace(/\s+/g, '-'));
    const move: MoveDetail = {
      id: raw.id,
      name: raw.name,
      nameTw: MOVE_NAMES_TW[toShowdownId(raw.name)] || getNameTw(raw.names) || raw.name,
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

/**
 * 純文字招式搜尋 hook
 *
 * 只負責：查詢文字 → 多語言名稱匹配 → 回傳 suggestions
 * 不參與任何 tactical filtering（屬性/種類/威力/命中等條件由 tacticalMoveFilters 負責）
 */
export function useMoveSearch(query: string) {
  const [suggestions, setSuggestions] = useState<MoveDetail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const allCached = await getAllMoves();
        const q = query.trim().toLowerCase();
        const qOrig = query.trim();

        const filtered = allCached
          .filter((m) => m.nameTw.includes(qOrig) || m.name.includes(q))
          .slice(0, 8);

        // 補充靜態中文名稱對照表（DB 快取不足時）
        if (filtered.length < 8) {
          // MOVE_NAMES_TW 格式：{ showdownId: "中文名" }
          const cachedIds = new Set(filtered.map((m) => toShowdownId(m.name)));
          const cnMatches = Object.entries(MOVE_NAMES_TW)
            .filter(([showdownId, cnName]) => cnName.includes(qOrig) && !cachedIds.has(showdownId))
            .slice(0, 8 - filtered.length)
            .map(([showdownId, cnName]): MoveDetail => ({
              id: 0,
              name: showdownId,
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
  }, [query]);

  return { suggestions, isSearching };
}
