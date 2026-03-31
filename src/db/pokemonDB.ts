import { openDB, IDBPDatabase } from "idb";
import { PokemonSummary, MoveDetail } from "../types/pokemon";

const DB_NAME = "pokemon-filter-db";
const DB_VERSION = 2;

export interface MetaRecord {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const pokemonStore = db.createObjectStore("pokemon", { keyPath: "id" });
          pokemonStore.createIndex("generation", "generation");
          db.createObjectStore("moves", { keyPath: "id" });
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("abilities")) {
            db.createObjectStore("abilities", { keyPath: "name" });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllPokemon(): Promise<PokemonSummary[]> {
  const db = await getDB();
  return db.getAll("pokemon");
}

export async function putPokemonBatch(batch: PokemonSummary[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("pokemon", "readwrite");
  await Promise.all([...batch.map((p) => tx.store.put(p)), tx.done]);
}

export async function getMoveByName(name: string): Promise<MoveDetail | undefined> {
  const db = await getDB();
  const all = await db.getAll("moves") as MoveDetail[];
  return all.find((m) => m.name === name);
}

export async function getMoveById(id: number): Promise<MoveDetail | undefined> {
  const db = await getDB();
  return db.get("moves", id);
}

export async function getAllMoves(): Promise<MoveDetail[]> {
  const db = await getDB();
  return db.getAll("moves");
}

export async function putMove(move: MoveDetail): Promise<void> {
  const db = await getDB();
  await db.put("moves", move);
}

export async function putMoveBatch(moves: MoveDetail[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("moves", "readwrite");
  await Promise.all([...moves.map((m) => tx.store.put(m)), tx.done]);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const record = await db.get("meta", key) as MetaRecord | undefined;
  return record?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["pokemon", "moves", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("pokemon").clear(),
    tx.objectStore("moves").clear(),
    tx.objectStore("meta").clear(),
    tx.done,
  ]);
  dbPromise = null;
}
