import { useState } from 'react';
import iconIntersection from '../../assets/icon/icon_intersection.png';
import iconUnion from '../../assets/icon/icon_union.png';
import { usePokemonStore } from '../../stores/usePokemonStore';
import { DEFAULT_STAT_RANGES } from '../../constants/stats';
import { ALL_TYPES, GENERATIONS } from '../../constants/types';
import { StatRangeFilter } from './StatRangeFilter';
import { TypeBadge } from '../pokemon/TypeBadge';
import { StatKey, EvolutionCategory, TriState } from '../../types/pokemon';
import { ABILITY_MAP } from '../../constants/abilityNames';
import { MoveFilterPanel } from './MoveFilterPanel';

const ALL_ABILITY_ENTRIES = Object.entries(ABILITY_MAP).map(([name, nameTw]) => ({ name, nameTw }));

const EVOLUTION_OPTIONS: { key: EvolutionCategory; label: string }[] = [
  { key: 'baby', label: '寶寶型' },
  { key: 'solo', label: '無進化型' },
  { key: 'final', label: '最終進化型' },
  { key: 'middle', label: '進化一次型' },
  { key: 'twice', label: '進化兩次型' },
  { key: 'branching', label: '分裂進化型' },
  { key: 'has-mega', label: '擁有Mega進化' },
  { key: 'mega', label: 'Mega進化' }
];

/** Wraps each panel with relative positioning and an optional × reset button in the top-right */
function Panel({ children, onReset, className = '' }: { children: React.ReactNode; onReset?: () => void; className?: string }) {
  return (
    <div className={`relative flex-none p-3 flex flex-col gap-2 ${className}`}>
      {onReset && (
        <button
          onClick={onReset}
          title="重置此欄位篩選"
          className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-[10px] text-gray-500 hover:text-white hover:bg-surface-hover rounded transition-colors leading-none"
        >
          ×
        </button>
      )}
      {children}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide text-center mb-2">{children}</div>;
}

/** Plan B: label row with separate ＋ (only) and － (exclude) buttons */
function OptionRow({
  label,
  state,
  onSet,
  neutralColor = 'text-gray-400'
}: {
  label: string;
  state: TriState;
  onSet: (s: TriState) => void;
  neutralColor?: string;
}) {
  const labelColor = state === 'only' ? 'text-accent-blue' : state === 'exclude' ? 'text-red-400' : neutralColor;
  const plusActive = state === 'only';
  const minusActive = state === 'exclude';
  return (
    <div className="flex items-center gap-1 select-none">
      <span className={`text-[11px] flex-1 whitespace-nowrap ${labelColor}`}>{label}</span>
      <button
        onClick={() => onSet(plusActive ? null : 'only')}
        title="Only"
        className={`w-5 h-5 flex items-center justify-center text-xs rounded border transition-colors leading-none ${
          plusActive
            ? 'border-accent-blue text-accent-blue bg-accent-blue/20'
            : 'border-surface-border text-gray-500 hover:border-accent-blue hover:text-accent-blue'
        }`}
      >
        ＋
      </button>
      <button
        onClick={() => onSet(minusActive ? null : 'exclude')}
        title="Exclude"
        className={`w-5 h-5 flex items-center justify-center text-xs rounded border transition-colors leading-none ${
          minusActive
            ? 'border-red-500 text-red-400 bg-red-500/20'
            : 'border-surface-border text-gray-500 hover:border-red-500 hover:text-red-400'
        }`}
      >
        －
      </button>
    </div>
  );
}

export function FilterPanel() {
  const {
    filterState,
    toggleType,
    toggleGeneration,
    setFilter,
    setStatRange,
    setTypeFilterMode,
    setEvolutionFilterItem,
    toggleAbilityFilter
  } = usePokemonStore();

  const [abilityQuery, setAbilityQuery] = useState('');

  // Per-panel active checks
  const panel1Active = filterState.searchText !== '' || filterState.generations.length > 0;
  const panel2Active =
    filterState.restrictedFilter !== null ||
    filterState.unrestrictedFilter !== null ||
    filterState.mythicalFilter !== null ||
    Object.values(filterState.evolutionFilter).some((v) => v !== null);
  const panel3Active = filterState.types.length > 0 || filterState.singleTypeOnly || filterState.dualTypeOnly;
  const panel4Active = filterState.abilityFilter.length > 0;
  const panel5Active = (Object.keys(DEFAULT_STAT_RANGES) as StatKey[]).some(
    (k) => filterState.statRanges[k][0] !== DEFAULT_STAT_RANGES[k][0] || filterState.statRanges[k][1] !== DEFAULT_STAT_RANGES[k][1]
  );

  // Per-panel reset handlers
  const resetPanel1 = () => setFilter({ searchText: '', generations: [] });
  const resetPanel2 = () =>
    setFilter({
      restrictedFilter: null,
      unrestrictedFilter: null,
      mythicalFilter: null,
      evolutionFilter: {}
    });
  const resetPanel3 = () => setFilter({ types: [], typeFilterMode: 'intersection', singleTypeOnly: false, dualTypeOnly: false });
  const resetPanel4 = () => setFilter({ abilityFilter: [] });
  const resetPanel5 = () => {
    (Object.keys(DEFAULT_STAT_RANGES) as StatKey[]).forEach((k) => setStatRange(k, DEFAULT_STAT_RANGES[k]));
  };

  const filteredAbilities = abilityQuery.trim()
    ? ALL_ABILITY_ENTRIES.filter(
        (a) =>
          (a.nameTw.includes(abilityQuery) || a.name.includes(abilityQuery.toLowerCase())) && !filterState.abilityFilter.includes(a.name)
      ).slice(0, 8)
    : [];

  const toggleBtn = (active: boolean) =>
    `text-[11px] px-1.5 py-1 rounded border transition-colors ${
      active ? 'border-accent-blue text-accent-blue bg-accent-blue/10' : 'border-surface-border text-gray-400 hover:border-gray-500'
    }`;

  return (
    <div className="border-b border-surface-border bg-surface-card shrink-0">
      <div className="overflow-x-auto">
        <div className="flex flex-row divide-x min-w-max divide-surface-border">
          {/* ── Panel 1: 名稱搜尋 + 世代 ── */}
          <Panel className="w-48" onReset={panel1Active ? resetPanel1 : undefined}>
            <input
              type="text"
              placeholder="搜尋寶可夢名稱..."
              value={filterState.searchText}
              onChange={(e) => setFilter({ searchText: e.target.value })}
              className="bg-surface-border text-xs text-white placeholder-gray-500 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue w-full"
            />
            <PanelHeader>世代</PanelHeader>
            <div className="grid grid-cols-3 gap-1">
              {GENERATIONS.map((g) => (
                <button key={g} onClick={() => toggleGeneration(g)} className={toggleBtn(filterState.generations.includes(g))}>
                  第{g}代
                </button>
              ))}
            </div>
          </Panel>

          {/* ── Panel 2: 分類 ── */}
          <Panel onReset={panel2Active ? resetPanel2 : undefined}>
            <PanelHeader>分類</PanelHeader>
            <div className="grid grid-flow-col grid-rows-4 gap-x-4 gap-y-1">
              {/* 對戰分類 */}
              <OptionRow
                label="對戰無限制傳說"
                state={filterState.unrestrictedFilter}
                onSet={(s) => setFilter({ unrestrictedFilter: s })}
                neutralColor="text-yellow-400"
              />
              <OptionRow
                label="對戰有限制傳說"
                state={filterState.restrictedFilter}
                onSet={(s) => setFilter({ restrictedFilter: s })}
                neutralColor="text-red-400"
              />
              <OptionRow
                label="幻之寶可夢"
                state={filterState.mythicalFilter}
                onSet={(s) => setFilter({ mythicalFilter: s })}
                neutralColor="text-purple-400"
              />
              {/* 進化分類 */}
              {EVOLUTION_OPTIONS.map((opt) => (
                <OptionRow
                  key={opt.key}
                  label={opt.label}
                  state={filterState.evolutionFilter[opt.key] ?? null}
                  onSet={(s) => setEvolutionFilterItem(opt.key, s)}
                />
              ))}
            </div>
          </Panel>

          {/* ── Panel 3: 屬性 ── */}
          <Panel onReset={panel3Active ? resetPanel3 : undefined}>
            <PanelHeader>屬性</PanelHeader>
            <div className="grid grid-cols-6 gap-1">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  style={{ width: 72 }}
                  className={`transition-all rounded ${
                    filterState.types.includes(t) ? 'opacity-100 ring-1 ring-white/60' : 'opacity-45 hover:opacity-75'
                  }`}
                >
                  <TypeBadge type={t} small className="w-full whitespace-nowrap" />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex overflow-hidden border rounded border-surface-border shrink-0">
                <button
                  onClick={() => setTypeFilterMode('intersection')}
                  title="交集（AND）"
                  className={`px-2 py-1 transition-colors ${
                    filterState.typeFilterMode === 'intersection' ? 'bg-accent-blue' : 'hover:bg-surface-hover'
                  }`}
                >
                  <img src={iconIntersection} alt="交集" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTypeFilterMode('union')}
                  title="聯集（OR）"
                  className={`px-2 py-1 transition-colors ${
                    filterState.typeFilterMode === 'union' ? 'bg-accent-blue' : 'hover:bg-surface-hover'
                  }`}
                >
                  <img src={iconUnion} alt="聯集" className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterState.singleTypeOnly}
                  onChange={(e) => setFilter({ singleTypeOnly: e.target.checked })}
                  className="accent-accent-blue"
                />
                單一組合屬性
              </label>
              <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterState.dualTypeOnly}
                  onChange={(e) => setFilter({ dualTypeOnly: e.target.checked })}
                  className="accent-accent-blue"
                />
                雙組合屬性
              </label>
            </div>
          </Panel>

          {/* ── Panel 4: 特性搜尋器 ── */}
          <Panel className="w-52" onReset={panel4Active ? resetPanel4 : undefined}>
            <PanelHeader>特性</PanelHeader>
            <input
              type="text"
              placeholder="搜尋特性..."
              value={abilityQuery}
              onChange={(e) => setAbilityQuery(e.target.value)}
              className="bg-surface-border text-xs text-white placeholder-gray-500 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue w-full"
            />
            {filteredAbilities.length > 0 && (
              <div className="overflow-y-auto border rounded max-h-28 border-surface-border bg-surface">
                {filteredAbilities.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => {
                      toggleAbilityFilter(a.name);
                      setAbilityQuery('');
                    }}
                    className="flex items-center justify-between w-full gap-2 px-2 py-1 text-xs text-left text-gray-300 hover:bg-surface-hover"
                  >
                    <span>{a.nameTw}</span>
                    <span className="text-gray-600 text-[10px] shrink-0">{a.name}</span>
                  </button>
                ))}
              </div>
            )}
            {filterState.abilityFilter.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filterState.abilityFilter.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30"
                  >
                    {ABILITY_MAP[name] || name}
                    <button onClick={() => toggleAbilityFilter(name)} className="leading-none hover:text-white">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Panel>

          {/* ── Panel 5: 種族值 ── */}
          <Panel className="w-[540px]" onReset={panel5Active ? resetPanel5 : undefined}>
            <PanelHeader>種族值</PanelHeader>
            <div className="flex divide-x divide-surface-border">
              <div className="flex flex-col flex-1">
                {(['hp', 'attack', 'defense'] as StatKey[]).map((stat) => (
                  <StatRangeFilter key={stat} statKey={stat} />
                ))}
              </div>
              <div className="flex flex-col flex-1">
                {(['spAtk', 'spDef', 'speed'] as StatKey[]).map((stat) => (
                  <StatRangeFilter key={stat} statKey={stat} />
                ))}
              </div>
            </div>
            <StatRangeFilter statKey="total" />
          </Panel>

          {/* ── Panel 6: 招式篩選 ── */}
          <MoveFilterPanel />
        </div>
      </div>
    </div>
  );
}
