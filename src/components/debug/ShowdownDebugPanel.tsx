/**
 * Showdown 資料層驗證面板（僅開發模式顯示）
 *
 * 驗證項目：
 *  1. 資料載入狀態與數量
 *  2. 招式 tags 正確性
 *  3. Learnset 查詢結果
 */

import { useShowdownStore } from "../../stores/useShowdownStore";
import { canLearnAllMovesInChain, getPrevoChain } from "../../lib/showdown/normalizeLearnset";
import { toShowdownId, resolveLearnsetId } from "../../lib/showdown/showdownId";

// 預期結果型別
interface MoveTagCase {
  moveId: string;
  tag: string;
  expected: boolean;
  getValue: (move: ReturnType<typeof useShowdownStore>["moves"][string]) => boolean;
}

interface LearnCase {
  pokemon: string;
  moves: string[];
  expected: boolean;
  label: string;
}

const MOVE_TAG_CASES: MoveTagCase[] = [
  {
    moveId: "aquajet",
    tag: "isHighPriority",
    expected: true,
    getValue: (m) => m.tags.isHighPriority,
  },
  {
    moveId: "aquajet",
    tag: "isContactMove",
    expected: true,
    getValue: (m) => m.tags.isContactMove,
  },
  {
    moveId: "hypervoice",
    tag: "isSoundMove",
    expected: true,
    getValue: (m) => m.tags.isSoundMove,
  },
  {
    moveId: "hypervoice",
    tag: "isContactMove",
    expected: false,
    getValue: (m) => m.tags.isContactMove,
  },
  {
    moveId: "ironhead",
    tag: "hasSecondaryEffect",
    expected: true,
    getValue: (m) => m.tags.hasSecondaryEffect,
  },
  {
    moveId: "dracometeor",
    tag: "hasSelfBoost",
    expected: true,
    getValue: (m) => m.tags.hasSelfBoost,
  },
];

const LEARNSET_CASES: LearnCase[] = [
  {
    pokemon: "charizard",
    moves: ["fireblast"],
    expected: true,
    label: "噴火龍 能學 噴射火焰",
  },
  {
    pokemon: "pikachu",
    moves: ["thunderbolt"],
    expected: true,
    label: "皮卡丘 能學 十萬伏特",
  },
  {
    pokemon: "gardevoir",
    moves: ["shadowball", "nastyplot"],
    expected: true,
    label: "沙奈朵 能同時學 暗影球 + 醜惡企圖",
  },
  {
    pokemon: "rattata",
    moves: ["fireblast"],
    expected: false,
    label: "小拉達 不能學 噴射火焰",
  },
  // 進化鏈繼承測試：aquajet 是 squirtle 的蛋招式，blastoise 應繼承
  {
    pokemon: "blastoise",
    moves: ["aquajet", "shellsmash"],
    expected: true,
    label: "水箭龜（含繼承）能同時學 水流噴射 + 貝殼破碎",
  },
  // 繼承邊界：僅前置進化才有的蛋招式
  {
    pokemon: "wartortle",
    moves: ["aquajet"],
    expected: true,
    label: "甲殼龜（含繼承）能學 水流噴射（squirtle 蛋技）",
  },
  // 反向不繼承：evolution 不應對前置進化有效
  {
    pokemon: "squirtle",
    moves: ["shellsmash"],
    expected: true,
    label: "傑尼龜 本身能學 貝殼破碎",
  },
];

function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
        ok ? "bg-green-900/60 text-green-300" : "bg-red-900/60 text-red-300"
      }`}
    >
      {ok ? "PASS" : "FAIL"}
    </span>
  );
}

function Row({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Badge ok={pass} />
      <span className={`text-xs font-mono ${pass ? "text-gray-300" : "text-red-400"}`}>
        {label}
      </span>
    </div>
  );
}

export function ShowdownDebugPanel() {
  const { status, moves, species, learnsetIndex, error } = useShowdownStore();

  const statusColor: Record<typeof status, string> = {
    idle: "text-gray-400",
    loading: "text-yellow-400",
    ready: "text-green-400",
    unavailable: "text-orange-400",
    error: "text-red-400",
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full text-sm">
      <h2 className="text-white font-semibold">Showdown 資料層驗證</h2>

      {/* 載入狀態 */}
      <section className="bg-surface-card rounded p-3 space-y-1">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">載入狀態</div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-400 text-xs">狀態：</span>
          <span className={`text-xs font-mono font-bold ${statusColor[status]}`}>{status}</span>
        </div>
        {status === "ready" && (
          <>
            <div className="text-xs text-gray-400">
              招式：<span className="text-white font-mono">{Object.keys(moves).length}</span>
            </div>
            <div className="text-xs text-gray-400">
              種族：<span className="text-white font-mono">{Object.keys(species).length}</span>
            </div>
            <div className="text-xs text-gray-400">
              Learnset 收錄種族數：
              <span className="text-white font-mono">
                {learnsetIndex?.bySpecies.size ?? 0}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Learnset 收錄招式數：
              <span className="text-white font-mono">
                {learnsetIndex?.byMove.size ?? 0}
              </span>
            </div>
          </>
        )}
        {status === "unavailable" && (
          <div className="text-xs text-orange-300 mt-1">
            未找到 /showdown/*.json，請先執行：
            <br />
            <code className="font-mono text-orange-200">node scripts/downloadShowdownData.mjs</code>
          </div>
        )}
        {status === "error" && (
          <div className="text-xs text-red-300 mt-1">{error}</div>
        )}
      </section>

      {status === "ready" && learnsetIndex && (
        <>
          {/* 招式 tag 驗證 */}
          <section className="bg-surface-card rounded p-3 space-y-1">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
              招式 Tags 驗證
            </div>
            {MOVE_TAG_CASES.map((c) => {
              const move = moves[c.moveId];
              if (!move) {
                return (
                  <Row
                    key={`${c.moveId}-${c.tag}`}
                    label={`${c.moveId} → ${c.tag}：找不到招式`}
                    pass={false}
                  />
                );
              }
              const actual = c.getValue(move);
              const pass = actual === c.expected;
              return (
                <Row
                  key={`${c.moveId}-${c.tag}`}
                  label={`${c.moveId}.tags.${c.tag} = ${String(actual)}（預期 ${String(c.expected)}）`}
                  pass={pass}
                />
              );
            })}
          </section>

          {/* Learnset 查詢驗證（含進化鏈繼承） */}
          <section className="bg-surface-card rounded p-3 space-y-1">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
              Learnset 查詢驗證（第九世代，含進化鏈繼承）
            </div>
            {LEARNSET_CASES.map((c) => {
              const speciesId = toShowdownId(c.pokemon);
              const moveIds = c.moves.map(toShowdownId);
              const prevoChain = getPrevoChain(speciesId, species);
              const chainStr = prevoChain.length > 0 ? ` ← ${prevoChain.join(" ← ")}` : "";
              const actual = canLearnAllMovesInChain(learnsetIndex, speciesId, moveIds, species);
              const pass = actual === c.expected;
              return (
                <Row
                  key={c.label}
                  label={`${c.label}（${speciesId}${chainStr}）→ ${String(actual)}`}
                  pass={pass}
                />
              );
            })}
          </section>

          {/* Blastoise / Squirtle learnset 診斷 */}
          <section className="bg-surface-card rounded p-3 space-y-2">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
              診斷：blastoise vs squirtle learnset
            </div>
            {(["blastoise", "squirtle"] as const).map((pokemonName) => {
              const TARGET_MOVES = ["aquajet", "shellsmash"];
              const resolvedId = resolveLearnsetId(pokemonName, learnsetIndex.bySpecies);
              const directId = toShowdownId(pokemonName);
              const inIndex = learnsetIndex.bySpecies.has(resolvedId);
              const moveSet = learnsetIndex.bySpecies.get(resolvedId);

              return (
                <div key={pokemonName} className="border border-surface-border rounded p-2 space-y-1">
                  <div className="text-xs text-white font-mono font-bold">{pokemonName}</div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    toShowdownId → <span className="text-yellow-300">{directId}</span>
                    {" | "}resolvedId → <span className="text-yellow-300">{resolvedId}</span>
                    {" | "}inIndex: <span className={inIndex ? "text-green-400" : "text-red-400"}>{String(inIndex)}</span>
                  </div>
                  {TARGET_MOVES.map((moveId) => {
                    const has = moveSet?.has(moveId) ?? false;
                    const rawEntries = learnsetIndex.bySpeciesDetailed.get(resolvedId)?.get(moveId);
                    return (
                      <div key={moveId} className="flex items-center gap-2">
                        <Badge ok={has} />
                        <span className="text-[11px] font-mono text-gray-300">
                          {moveId}: {has ? (rawEntries ? JSON.stringify(rawEntries) : "present") : "NOT IN LEARNSET"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>

          {/* 個別招式詳細 */}
          <section className="bg-surface-card rounded p-3">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
              招式詳細（aquajet / hypervoice）
            </div>
            {["aquajet", "hypervoice"].map((id) => {
              const m = moves[id];
              if (!m) return <div key={id} className="text-xs text-red-400">{id}：找不到</div>;
              return (
                <div key={id} className="mb-2">
                  <div className="text-xs text-white font-mono mb-1">
                    {id} — {m.type} / {m.category} / BP {m.basePower} / priority {m.priority}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(m.tags) as (keyof typeof m.tags)[])
                      .filter((k) => m.tags[k] === true)
                      .map((k) => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-blue-300 font-mono">
                          {k}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
