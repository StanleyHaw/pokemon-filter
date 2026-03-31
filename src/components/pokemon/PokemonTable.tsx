import { useState } from "react";
import { usePokemonStore } from "../../stores/usePokemonStore";
import { useFilteredPokemon } from "../../hooks/useFilteredPokemon";
import { PokemonRow } from "./PokemonRow";
import { PokemonDetailModal } from "./PokemonDetailModal";
import { FilterPanel } from "../filters/FilterPanel";
import { PokemonSummary, SortConfig } from "../../types/pokemon";
import iconHp  from "../../assets/icon/stats_hp.png";
import iconAtk from "../../assets/icon/stats_atk.png";
import iconDef from "../../assets/icon/stats_def.png";
import iconSpa from "../../assets/icon/stats_spa.png";
import iconSpd from "../../assets/icon/stats_spd.png";
import iconSpe from "../../assets/icon/stats_spe.png";

type SortKey = SortConfig["key"];

// stat columns that are sortable
const STAT_COLS: { key: SortKey; label: string; color: string; icon?: string }[] = [
  { key: "hp",      label: "HP",   color: "#FF5959", icon: iconHp  },
  { key: "attack",  label: "攻擊", color: "#F5AC78", icon: iconAtk },
  { key: "defense", label: "防禦", color: "#FAE078", icon: iconDef },
  { key: "spAtk",   label: "特攻", color: "#9DB7F5", icon: iconSpa },
  { key: "spDef",   label: "特防", color: "#A7DB8D", icon: iconSpd },
  { key: "speed",   label: "速度", color: "#FA92B2", icon: iconSpe },
  { key: "total",   label: "總和", color: "#8e8e9a"                },
];

// total colspan: 1(#) + 1(img) + 1(name) + 2(types) + 3(abilities) + 7(stats) + 1(weight) + 1(height) [+ 1(moves)]
const BASE_COLS = 17;

export function PokemonTable() {
  const { allPokemon, filterState, sortConfig, setSort, loadingState, loadingProgress, loadingTotal, moveLoadingState, moveLoadingProgress, moveLoadingTotal } = usePokemonStore();
  const filtered = useFilteredPokemon(allPokemon, filterState, sortConfig);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSummary | null>(null);

  const hasMoveFilter = filterState.moveFilter.length > 0;
  const TOTAL_COLS = BASE_COLS + (hasMoveFilter ? 1 : 0);

  const handleSort = (key: SortKey) => {
    if (sortConfig.key === key) {
      setSort(key, sortConfig.direction === "asc" ? "desc" : "asc");
    } else {
      setSort(key, "desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className="text-gray-600 ml-0.5 text-[10px]">⇅</span>;
    return <span className="text-white ml-0.5 text-[10px]">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>;
  };

  const isLoading = loadingState === "loading";
  const showPartialBanner = loadingState === "partial";

  // shared th classes
  const thBase = "px-2 py-1.5 text-xs font-medium whitespace-nowrap select-none border-b border-surface-border";
  const thSortable = `${thBase} cursor-pointer hover:text-white text-gray-300`;
  const thLabel = `${thBase} text-gray-300`;
  // group header row
  const thGroup = "px-2 py-1.5 text-xs font-semibold text-white text-center border-b border-surface-border";

  return (
    <div className="flex flex-col h-full">
      <FilterPanel />

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-gray-400 border-b border-surface-border bg-surface-card">
        <span className="flex items-center gap-3">
          {isLoading && (
            <span className="text-yellow-400">正在載入寶可夢... {loadingProgress} / {loadingTotal}</span>
          )}
          {showPartialBanner && (
            <span className="text-yellow-400">背景持續載入寶可夢... {loadingProgress} / {loadingTotal}</span>
          )}
          {moveLoadingState === "loading" && moveLoadingTotal > 0 && (
            <span className="text-blue-400">
              載入招式資料... {moveLoadingProgress} / {moveLoadingTotal}
              <span className="inline-block ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </span>
          )}
          {moveLoadingState === "complete" && !isLoading && !showPartialBanner && (
            <span className="text-gray-500">招式資料已就緒</span>
          )}
        </span>
        <span className="text-gray-300">
          共 <strong className="text-white">{filtered.length}</strong> 筆
          {allPokemon.length > 0 && ` / ${allPokemon.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: "1180px" }}>
          <thead className="sticky top-0 z-10 bg-surface-card">
            {/* Row 1: Group headers */}
            <tr className="bg-surface-card border-b border-surface-border">
              {/* 圖鑑號 rowspan=2 */}
              <th
                rowSpan={2}
                className={`${thSortable} text-center cursor-pointer`}
                onClick={() => handleSort("id")}
              >
                編號{sortIcon("id")}
              </th>

              {/* 寶可夢 group */}
              <th colSpan={2} className={`${thGroup} border-l border-surface-border`}>
                寶可夢
              </th>

              {/* 屬性 group */}
              <th
                colSpan={2}
                className={`${thGroup} border-l border-surface-border`}
                style={{ backgroundColor: "#c0392b" }}
              >
                屬性
              </th>

              {/* 特性 group */}
              <th
                colSpan={3}
                className={`${thGroup} border-l border-surface-border`}
                style={{ backgroundColor: "#e67e22" }}
              >
                特性
              </th>

              {/* 種族值 group */}
              <th
                colSpan={7}
                className={`${thGroup} border-l border-surface-border`}
                style={{ backgroundColor: "#6259c4" }}
              >
                種族值
              </th>

              {/* 體重 rowspan=2 */}
              <th
                rowSpan={2}
                className={`${thSortable} text-center border-l border-surface-border`}
                onClick={() => handleSort("weight")}
              >
                體重<br />(kg){sortIcon("weight")}
              </th>

              {/* 身高 rowspan=2 */}
              <th
                rowSpan={2}
                className={`${thSortable} text-center`}
                onClick={() => handleSort("height")}
              >
                身高<br />(m){sortIcon("height")}
              </th>

              {/* 招式 group (conditional) */}
              {hasMoveFilter && (
                <th
                  rowSpan={2}
                  className={`${thLabel} text-center border-l border-surface-border`}
                  style={{ backgroundColor: "rgba(59,130,246,0.15)", minWidth: 140 }}
                >
                  可學習的招式
                </th>
              )}
            </tr>

            {/* Row 2: Column-level headers */}
            <tr className="bg-surface-card">
              {/* 寶可夢 sub-cols */}
              <th className={`${thLabel} text-center border-l border-surface-border`}>圖像</th>
              <th
                className={`${thSortable}`}
                onClick={() => handleSort("nameTw")}
              >
                名稱{sortIcon("nameTw")}
              </th>

              {/* 屬性 sub-cols */}
              <th className={`${thLabel} text-center border-l border-surface-border`} style={{ backgroundColor: "rgba(192,57,43,0.25)" }}>屬性一</th>
              <th className={`${thLabel} text-center`} style={{ backgroundColor: "rgba(192,57,43,0.25)" }}>屬性二</th>

              {/* 特性 sub-cols */}
              <th className={`${thLabel} text-center border-l border-surface-border`} style={{ backgroundColor: "rgba(230,126,34,0.25)" }}>特性一</th>
              <th className={`${thLabel} text-center`} style={{ backgroundColor: "rgba(230,126,34,0.25)" }}>特性二</th>
              <th className={`${thLabel} text-center`} style={{ backgroundColor: "rgba(230,126,34,0.25)" }}>隱藏特性</th>

              {/* 種族值 sub-cols */}
              {STAT_COLS.map((col) => (
                <th
                  key={col.key}
                  className={`${thSortable} text-center border-l border-surface-border`}
                  style={{
                    backgroundColor: "#6259c4" + "44",
                    width: col.key === "total" ? 52 : 40,
                    minWidth: col.key === "total" ? 52 : 40,
                  }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center justify-center gap-0.5">
                    {col.icon && <img src={col.icon} alt="" className="w-3.5 h-3.5 shrink-0" />}
                    {col.label}
                  </span>
                  {sortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && allPokemon.length > 0 ? (
              <tr>
                <td colSpan={TOTAL_COLS} className="py-16 text-center text-gray-500">
                  沒有符合條件的寶可夢
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={TOTAL_COLS} className="py-16 text-center text-gray-500">
                  正在載入寶可夢資料...
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PokemonRow key={p.id} pokemon={p} onClick={setSelectedPokemon} moveFilter={filterState.moveFilter} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPokemon && (
        <PokemonDetailModal
          pokemon={selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}
