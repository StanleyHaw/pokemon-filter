import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { usePokemonStore } from '../../stores/usePokemonStore';
import { useMoveSearch, fetchAndCacheMove } from '../../hooks/useMoveSearch';
import { useShowdownStore } from '../../stores/useShowdownStore';
import { toShowdownId } from '../../lib/showdown/showdownId';
import { TypeBadge } from '../pokemon/TypeBadge';
import { DAMAGE_CLASS_LABELS } from '../../constants/moves';
import { ALL_TYPES } from '../../constants/types';
import { MOVE_GROUPS } from '../../constants/moveGroups';
import type { MoveGroupId } from '../../constants/moveGroups';

// 前半段：戰術語意群組（靜態 moveIds）
const TACTICAL_GROUP_IDS: MoveGroupId[] = [
  'pivotMoves', 'priorityMoves', 'recoveryMoves', 'hazardRemovalMoves',
  'setupMoves', 'weatherSetters', 'terrainSetters', 'trappingMoves', 'statusMoves',
];

// 後半段：招式特性群組（tag-backed，動態解析）
const TAG_GROUP_IDS: MoveGroupId[] = [
  'contactMoves', 'soundMoves', 'punchMoves', 'biteMoves', 'slicingMoves',
];

export function MoveFilterPanel() {
  const {
    filterState,
    setFilter,
    setTacticalMoveFilter,
    resetTacticalMoveFilters,
    toggleMoveFilter,
    toggleMoveGroupFilter,
  } = usePokemonStore();

  const [query, setQuery] = useState('');
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const { suggestions, isSearching } = useMoveSearch(query);
  const { moves } = useShowdownStore();

  const tf = filterState.tacticalMoveFilters;

  // A: direct move search — only manages moveFilter
  const isAActive = filterState.moveFilter.length > 0;
  const resetA = () => setFilter({ moveFilter: [] });

  // B: tactical group section — manages moveGroupFilter + tacticalMoveFilters
  const isBActive =
    filterState.moveGroupFilter.length > 0 ||
    tf.damageClass !== '' ||
    tf.type !== '' ||
    tf.powerMin !== 0 ||
    tf.powerMax !== 250 ||
    tf.accuracyMin !== 0 ||
    tf.accuracyMax !== 100;

  const resetB = () => {
    setFilter({ moveGroupFilter: [] });
    resetTacticalMoveFilters();
  };

  const toggleBtn = (active: boolean) =>
    `text-[11px] px-1.5 py-1 rounded border transition-colors ${
      active
        ? 'border-accent-blue text-accent-blue bg-accent-blue/10'
        : 'border-surface-border text-gray-400 hover:border-gray-500'
    }`;

  return (
    <div className="flex-none p-3 flex flex-col gap-3 w-72">

      {/* ══ A: 單招搜尋區 ══════════════════════════════════════════ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">單招搜尋</div>
          {isAActive && (
            <button
              onClick={resetA}
              className="text-[10px] px-1.5 py-0.5 rounded border border-red-600/60 text-red-400 hover:bg-red-600/20 transition-colors leading-none"
            >
              重置
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="搜尋招式名稱（中文或英文）..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-surface-border text-xs text-white placeholder-gray-500 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue w-full pr-14"
          />
          {isSearching && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">搜尋中...</span>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="overflow-y-auto border rounded max-h-28 border-surface-border bg-surface">
            {suggestions.map((m) => {
              const alreadySelected = filterState.moveFilter.some((f) => f.name === m.name);
              return (
                <button
                  key={m.name}
                  disabled={alreadySelected}
                  onClick={async () => {
                    let move = m;
                    if (move.learnedByPokemon.length === 0) {
                      const full = await fetchAndCacheMove(move.name);
                      if (full) move = full;
                    }
                    toggleMoveFilter(move);
                    setQuery('');
                  }}
                  className={`flex items-center justify-between w-full gap-2 px-2 py-1 text-xs text-left ${
                    alreadySelected ? 'text-gray-600 cursor-default' : 'text-gray-300 hover:bg-surface-hover'
                  }`}
                >
                  <span>{moves?.[toShowdownId(m.name)]?.nameTw || m.nameTw || m.name}</span>
                  <span className="text-gray-600 text-[10px] shrink-0">{m.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {filterState.moveFilter.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {filterState.moveFilter.map((m) => (
              <span
                key={m.name}
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-blue-300 border border-accent-blue/30"
              >
                {moves?.[toShowdownId(m.name)]?.nameTw || m.nameTw || m.name}
                <button onClick={() => toggleMoveFilter(m)} className="leading-none hover:text-white">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border" />

      {/* ══ B: 戰術群組篩選區 ════════════════════════════════════════ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">戰術群組篩選</div>
          {isBActive && (
            <button
              onClick={resetB}
              className="text-[10px] px-1.5 py-0.5 rounded border border-red-600/60 text-red-400 hover:bg-red-600/20 transition-colors leading-none"
            >
              重置
            </button>
          )}
        </div>

        {/* 前半段：戰術語意群組 */}
        <div className="flex flex-wrap gap-1">
          {TACTICAL_GROUP_IDS.map((groupId) => {
            const active = filterState.moveGroupFilter.includes(groupId);
            return (
              <button
                key={groupId}
                onClick={() => toggleMoveGroupFilter(groupId)}
                title={MOVE_GROUPS[groupId].description}
                className={`text-[11px] px-1.5 py-1 rounded border transition-colors ${
                  active
                    ? 'border-orange-500 text-orange-300 bg-orange-900/20'
                    : 'border-surface-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {MOVE_GROUPS[groupId].label}
              </button>
            );
          })}
        </div>

        {/* 後半段：招式特性群組（tag-backed） */}
        <div className="flex flex-wrap gap-1">
          {TAG_GROUP_IDS.map((groupId) => {
            const active = filterState.moveGroupFilter.includes(groupId);
            return (
              <button
                key={groupId}
                onClick={() => toggleMoveGroupFilter(groupId)}
                title={MOVE_GROUPS[groupId].description}
                className={`text-[11px] px-1.5 py-1 rounded border transition-colors ${
                  active
                    ? 'border-orange-500 text-orange-300 bg-orange-900/20'
                    : 'border-surface-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {MOVE_GROUPS[groupId].label}
              </button>
            );
          })}
        </div>

        {/* Sub-conditions: damageClass / type */}
        <div className="flex items-center flex-wrap gap-1">
          {(['physical', 'special', 'status'] as const).map((dc) => (
            <button
              key={dc}
              onClick={() => setTacticalMoveFilter({ damageClass: tf.damageClass === dc ? '' : dc })}
              className={toggleBtn(tf.damageClass === dc)}
            >
              {DAMAGE_CLASS_LABELS[dc]}
            </button>
          ))}
          <button
            onClick={() => setTypePickerOpen((v) => !v)}
            className={toggleBtn(!!tf.type || typePickerOpen)}
          >
            {tf.type ? `屬性: ${tf.type}` : '屬性 ▾'}
          </button>
        </div>

        {/* Inline expanded: Type picker */}
        {typePickerOpen && (
          <div className="border border-surface-border rounded p-2 bg-surface">
            <div className="grid grid-cols-6 gap-1">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTacticalMoveFilter({ type: tf.type === t ? '' : t }); setTypePickerOpen(false); }}
                  style={{ width: 40 }}
                  className={`transition-all rounded ${tf.type === t ? 'opacity-100 ring-1 ring-white/60' : 'opacity-45 hover:opacity-75'}`}
                >
                  <TypeBadge type={t} small className="w-full" />
                </button>
              ))}
            </div>
            {tf.type && (
              <button
                onClick={() => { setTacticalMoveFilter({ type: '' }); setTypePickerOpen(false); }}
                className="mt-1 text-[10px] text-gray-500 hover:text-white w-full text-center"
              >
                清除屬性篩選
              </button>
            )}
          </div>
        )}

        {/* Power range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 w-6 shrink-0">威力</span>
          <input
            type="number"
            className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
            value={tf.powerMin}
            min={0}
            max={tf.powerMax}
            onChange={(e) => setTacticalMoveFilter({ powerMin: Number(e.target.value) })}
          />
          <span className="text-gray-500 text-xs">-</span>
          <input
            type="number"
            className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
            value={tf.powerMax}
            min={tf.powerMin}
            max={250}
            onChange={(e) => setTacticalMoveFilter({ powerMax: Number(e.target.value) })}
          />
          <div className="flex-1 min-w-[60px]">
            <Slider.Root
              min={0}
              max={250}
              step={5}
              value={[tf.powerMin, tf.powerMax]}
              onValueChange={(v) => setTacticalMoveFilter({ powerMin: v[0], powerMax: v[1] })}
              className="relative flex items-center select-none h-4"
            >
              <Slider.Track className="relative bg-surface-border rounded-full h-1 flex-1">
                <Slider.Range className="absolute h-full rounded-full bg-accent-blue" />
              </Slider.Track>
              <Slider.Thumb className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer bg-accent-blue border-accent-blue" />
              <Slider.Thumb className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer bg-accent-blue border-accent-blue" />
            </Slider.Root>
          </div>
        </div>

        {/* Accuracy range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 w-6 shrink-0">命中</span>
          <input
            type="number"
            className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
            value={tf.accuracyMin}
            min={0}
            max={tf.accuracyMax}
            onChange={(e) => setTacticalMoveFilter({ accuracyMin: Number(e.target.value) })}
          />
          <span className="text-gray-500 text-xs">-</span>
          <input
            type="number"
            className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
            value={tf.accuracyMax}
            min={tf.accuracyMin}
            max={100}
            onChange={(e) => setTacticalMoveFilter({ accuracyMax: Number(e.target.value) })}
          />
          <div className="flex-1 min-w-[60px]">
            <Slider.Root
              min={0}
              max={100}
              step={5}
              value={[tf.accuracyMin, tf.accuracyMax]}
              onValueChange={(v) => setTacticalMoveFilter({ accuracyMin: v[0], accuracyMax: v[1] })}
              className="relative flex items-center select-none h-4"
            >
              <Slider.Track className="relative bg-surface-border rounded-full h-1 flex-1">
                <Slider.Range className="absolute h-full rounded-full bg-accent-blue" />
              </Slider.Track>
              <Slider.Thumb className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer bg-accent-blue border-accent-blue" />
              <Slider.Thumb className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer bg-accent-blue border-accent-blue" />
            </Slider.Root>
          </div>
        </div>
      </div>

    </div>
  );
}
