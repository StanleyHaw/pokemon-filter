import { getAllMoves, putMoveBatch, getMeta, setMeta } from "../db/pokemonDB";
import { fetchMoveList, fetchMove, getNameTw, extractIdFromUrl } from "./pokeapi";
import { MoveDetail } from "../types/pokemon";
import { MOVE_NAMES_TW } from "../constants/moveNamesCn";
import { toShowdownId } from "../lib/showdown/showdownId";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;

export type MoveLoadingState = "idle" | "loading" | "complete" | "error";

export interface MoveLoaderCallbacks {
  onProgress: (loaded: number, total: number) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
  onStateChange: (state: MoveLoadingState) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transformRawMove(raw: Awaited<ReturnType<typeof fetchMove>>): MoveDetail {
  return {
    id: raw.id,
    name: raw.name,
    nameTw: MOVE_NAMES_TW[toShowdownId(raw.name)] || getNameTw(raw.names) || raw.name,
    type: raw.type.name,
    damageClass: raw.damage_class.name as MoveDetail["damageClass"],
    category: raw.meta?.category?.name ?? "unique",
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
    priority: raw.priority,
    effect:
      raw.effect_entries.find((e) => e.language.name === "zh-Hant")?.short_effect ||
      raw.effect_entries.find((e) => e.language.name === "en")?.short_effect ||
      "",
    target: raw.target?.name ?? "",
    learnedByPokemon: raw.learned_by_pokemon.map((p) => ({
      name: p.name,
      id: extractIdFromUrl(p.url),
      nameTw: p.name,
    })),
  };
}

export async function initializeMoveData(callbacks: MoveLoaderCallbacks): Promise<void> {
  const { onProgress, onComplete, onError, onStateChange } = callbacks;

  try {
    onStateChange("loading");

    // Check cache freshness
    const lastFetched = await getMeta<number>("moves_last_fetched_v1");
    const cachedCount = await getMeta<number>("moves_count_v1");

    if (lastFetched && cachedCount && Date.now() - lastFetched < CACHE_TTL_MS) {
      const cached = await getAllMoves();
      if (cached.length >= cachedCount * 0.95) {
        onProgress(cached.length, cached.length);
        onStateChange("complete");
        onComplete();
        return;
      }
    }

    // Fetch full move list
    const moveList = await fetchMoveList(2000);
    const total = moveList.length;
    onProgress(0, total);

    const cachedMoves = await getAllMoves();
    const cachedByName = new Map(cachedMoves.map((m) => [m.name, m]));
    let loaded = 0;

    for (let i = 0; i < moveList.length; i += BATCH_SIZE) {
      const batch = moveList.slice(i, i + BATCH_SIZE);
      const toFetch = batch.filter((r) => !cachedByName.has(r.name));

      if (toFetch.length > 0) {
        const results = await Promise.allSettled(toFetch.map((r) => fetchMove(r.name)));
        const moves: MoveDetail[] = [];

        for (const result of results) {
          if (result.status === "fulfilled") {
            try {
              moves.push(transformRawMove(result.value));
            } catch {
              // skip malformed entries
            }
          }
        }

        if (moves.length > 0) {
          await putMoveBatch(moves);
          for (const m of moves) cachedByName.set(m.name, m);
        }
      }

      loaded = Math.min(i + BATCH_SIZE, total);
      onProgress(loaded, total);

      if (i + BATCH_SIZE < moveList.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const finalCount = (await getAllMoves()).length;
    await setMeta("moves_last_fetched_v1", Date.now());
    await setMeta("moves_count_v1", finalCount);

    onStateChange("complete");
    onComplete();
  } catch (err) {
    onStateChange("error");
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
