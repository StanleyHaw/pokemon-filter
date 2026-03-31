import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { usePokemonStore } from '../../stores/usePokemonStore';
import { useMoveSearch, fetchAndCacheMove, MoveSearchFilters } from '../../hooks/useMoveSearch';
import { TypeBadge } from '../pokemon/TypeBadge';
import { DAMAGE_CLASS_LABELS, MOVE_CATEGORY_LABELS } from '../../constants/moves';
import { MOVE_TARGET_LABELS } from '../../constants/moveTargets';
import { ALL_TYPES } from '../../constants/types';

type OpenSection = null | 'type' | 'target' | 'category';

export function MoveFilterPanel() {
  const { filterState, setFilter, toggleMoveFilter } = usePokemonStore();

  const [query, setQuery] = useState('');
  const [damageClass, setDamageClass] = useState('');
  const [type, setType] = useState('');
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState('');
  const [powerRange, setPowerRange] = useState<[number, number]>([0, 250]);
  const [accuracyRange, setAccuracyRange] = useState<[number, number]>([0, 100]);
  const [openSection, setOpenSection] = useState<OpenSection>(null);

  const filters: MoveSearchFilters = {
    damageClass,
    type,
    target,
    category,
    powerMin: powerRange[0],
    powerMax: powerRange[1],
    accuracyMin: accuracyRange[0],
    accuracyMax: accuracyRange[1],
  };

  const { suggestions, isSearching } = useMoveSearch(query, filters);

  const isPanelActive = filterState.moveFilter.length > 0;
  const resetPanel = () => setFilter({ moveFilter: [] });

  const toggleSection = (s: OpenSection) => setOpenSection(openSection === s ? null : s);

  const toggleBtn = (active: boolean) =>
    `text-[11px] px-1.5 py-1 rounded border transition-colors ${
      active
        ? 'border-accent-blue text-accent-blue bg-accent-blue/10'
        : 'border-surface-border text-gray-400 hover:border-gray-500'
    }`;

  return (
    <div className="relative flex-none p-3 flex flex-col gap-2 w-72">
      {isPanelActive && (
        <button
          onClick={resetPanel}
          title="重置此欄位篩選"
          className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded border border-red-600/60 text-red-400 hover:bg-red-600/20 transition-colors leading-none"
        >
          重置
        </button>
      )}

      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide text-center mb-0">招式篩選</div>

      {/* Search bar */}
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

      {/* Suggestions */}
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
                <span>{m.nameTw}</span>
                <span className="text-gray-600 text-[10px] shrink-0">{m.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Damage class quick filter */}
      <div className="flex items-center flex-wrap gap-1">
        {(['physical', 'special', 'status'] as const).map((dc) => (
          <button
            key={dc}
            onClick={() => setDamageClass(damageClass === dc ? '' : dc)}
            className={toggleBtn(damageClass === dc)}
          >
            {DAMAGE_CLASS_LABELS[dc]}
          </button>
        ))}
        <button
          onClick={() => toggleSection('type')}
          className={toggleBtn(!!type || openSection === 'type')}
        >
          {type ? `屬性: ${type}` : '屬性 ▾'}
        </button>
        <button
          onClick={() => toggleSection('target')}
          className={toggleBtn(!!target || openSection === 'target')}
        >
          {target ? MOVE_TARGET_LABELS[target] ?? target : '範圍 ▾'}
        </button>
        <button
          onClick={() => toggleSection('category')}
          className={toggleBtn(!!category || openSection === 'category')}
        >
          {category ? MOVE_CATEGORY_LABELS[category] ?? category : '種類 ▾'}
        </button>
      </div>

      {/* Inline expanded: Type picker */}
      {openSection === 'type' && (
        <div className="border border-surface-border rounded p-2 bg-surface">
          <div className="grid grid-cols-6 gap-1">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setType(type === t ? '' : t); setOpenSection(null); }}
                style={{ width: 40 }}
                className={`transition-all rounded ${type === t ? 'opacity-100 ring-1 ring-white/60' : 'opacity-45 hover:opacity-75'}`}
              >
                <TypeBadge type={t} small className="w-full" />
              </button>
            ))}
          </div>
          {type && (
            <button onClick={() => { setType(''); setOpenSection(null); }} className="mt-1 text-[10px] text-gray-500 hover:text-white w-full text-center">清除屬性篩選</button>
          )}
        </div>
      )}

      {/* Inline expanded: Target picker */}
      {openSection === 'target' && (
        <div className="border border-surface-border rounded p-1 bg-surface max-h-40 overflow-y-auto">
          {Object.entries(MOVE_TARGET_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setTarget(target === k ? '' : k); setOpenSection(null); }}
              className={`w-full text-left text-xs px-2 py-1 rounded ${
                target === k ? 'text-accent-blue bg-accent-blue/10' : 'text-gray-300 hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
          {target && (
            <button onClick={() => { setTarget(''); setOpenSection(null); }} className="mt-1 text-[10px] text-gray-500 hover:text-white w-full text-center py-1">清除範圍篩選</button>
          )}
        </div>
      )}

      {/* Inline expanded: Category picker */}
      {openSection === 'category' && (
        <div className="border border-surface-border rounded p-1 bg-surface max-h-40 overflow-y-auto">
          {Object.entries(MOVE_CATEGORY_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setCategory(category === k ? '' : k); setOpenSection(null); }}
              className={`w-full text-left text-xs px-2 py-1 rounded ${
                category === k ? 'text-accent-blue bg-accent-blue/10' : 'text-gray-300 hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
          {category && (
            <button onClick={() => { setCategory(''); setOpenSection(null); }} className="mt-1 text-[10px] text-gray-500 hover:text-white w-full text-center py-1">清除種類篩選</button>
          )}
        </div>
      )}

      {/* Power range */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 w-6 shrink-0">威力</span>
        <input
          type="number"
          className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
          value={powerRange[0]}
          min={0}
          max={powerRange[1]}
          onChange={(e) => setPowerRange([Number(e.target.value), powerRange[1]])}
        />
        <span className="text-gray-500 text-xs">-</span>
        <input
          type="number"
          className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
          value={powerRange[1]}
          min={powerRange[0]}
          max={250}
          onChange={(e) => setPowerRange([powerRange[0], Number(e.target.value)])}
        />
        <div className="flex-1 min-w-[60px]">
          <Slider.Root
            min={0}
            max={250}
            step={5}
            value={powerRange}
            onValueChange={(v) => setPowerRange(v as [number, number])}
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
          value={accuracyRange[0]}
          min={0}
          max={accuracyRange[1]}
          onChange={(e) => setAccuracyRange([Number(e.target.value), accuracyRange[1]])}
        />
        <span className="text-gray-500 text-xs">-</span>
        <input
          type="number"
          className="w-10 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
          value={accuracyRange[1]}
          min={accuracyRange[0]}
          max={100}
          onChange={(e) => setAccuracyRange([accuracyRange[0], Number(e.target.value)])}
        />
        <div className="flex-1 min-w-[60px]">
          <Slider.Root
            min={0}
            max={100}
            step={5}
            value={accuracyRange}
            onValueChange={(v) => setAccuracyRange(v as [number, number])}
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

      {/* Selected moves chips */}
      {filterState.moveFilter.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-surface-border">
          {filterState.moveFilter.map((m) => (
            <span
              key={m.name}
              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-blue-300 border border-accent-blue/30"
            >
              {m.nameTw}
              <button onClick={() => toggleMoveFilter(m)} className="leading-none hover:text-white">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
