import { useMoveStore } from "../../stores/useMoveStore";
import { MoveResultCard } from "./MoveResultCard";
import { ALL_TYPES, TYPE_LABELS } from "../../constants/types";
import { ALL_MOVE_CATEGORIES, MOVE_CATEGORY_LABELS, DAMAGE_CLASS_LABELS } from "../../constants/moves";

export function MoveSearchPanel() {
  const {
    searchName,
    selectedCategory,
    selectedType,
    selectedDamageClass,
    results,
    isSearching,
    selectedMove,
    error,
    setSearchName,
    setCategory,
    setType,
    setDamageClass,
    selectMove,
    search,
    clearResults,
  } = useMoveStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Controls */}
      <div className="border-b border-surface-border bg-surface-card px-4 py-3">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          {/* Move name input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">招式名稱（英文）</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="例：follow-me、rage-powder..."
              className="bg-surface-border text-sm text-white placeholder-gray-500 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue w-52"
            />
          </div>

          {/* Type select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">招式屬性</label>
            <select
              value={selectedType}
              onChange={(e) => setType(e.target.value)}
              className="bg-surface-border text-sm text-white rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue cursor-pointer"
            >
              <option value="">全部屬性</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Category select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">招式分類</label>
            <select
              value={selectedCategory}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-surface-border text-sm text-white rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue cursor-pointer"
            >
              <option value="">全部分類</option>
              {ALL_MOVE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{MOVE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Damage class select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">招式種類</label>
            <select
              value={selectedDamageClass}
              onChange={(e) => setDamageClass(e.target.value)}
              className="bg-surface-border text-sm text-white rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent-blue cursor-pointer"
            >
              <option value="">全部種類</option>
              {Object.entries(DAMAGE_CLASS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-1.5 rounded bg-accent-blue text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "搜尋中..." : "搜尋"}
          </button>

          {results.length > 0 && (
            <button
              type="button"
              onClick={clearResults}
              className="px-3 py-1.5 rounded border border-surface-border text-gray-400 text-sm hover:text-white hover:border-gray-500 transition-colors"
            >
              清除
            </button>
          )}
        </form>

        <p className="text-xs text-gray-500 mt-2">
          提示：可單獨依屬性或分類篩選，無需輸入名稱。例如選擇「特殊效果」分類可找到跟我來、怒粉等集火招式。招式名稱請使用 PokéAPI 英文格式（以連字符連接）。
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 rounded border border-accent-red/50 bg-accent-red/10 text-accent-red text-sm">
            {error}
          </div>
        )}

        {isSearching && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">⏳</div>
              <div>搜尋中，請稍候...</div>
              <div className="text-xs mt-1 text-gray-500">首次搜尋需要從網路取得資料</div>
            </div>
          </div>
        )}

        {!isSearching && results.length === 0 && !error && (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <div>搜尋招式，找出哪些寶可夢可以學習</div>
              <div className="text-xs mt-2 text-gray-600">支援依屬性、分類篩選</div>
            </div>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-3">
              找到 <strong className="text-white">{results.length}</strong> 個招式
              {results.length >= 50 && <span className="ml-1 text-yellow-500">（最多顯示 50 筆）</span>}
            </div>
            {results.map((move) => (
              <MoveResultCard
                key={move.id}
                move={move}
                onSelect={selectMove}
                isSelected={selectedMove?.id === move.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
