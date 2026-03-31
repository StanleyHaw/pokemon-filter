import { useState } from "react";
import { MoveDetail } from "../../types/pokemon";
import { TypeBadge } from "../pokemon/TypeBadge";
import { MOVE_CATEGORY_LABELS, DAMAGE_CLASS_LABELS } from "../../constants/moves";
import { usePokemonStore } from "../../stores/usePokemonStore";

interface Props {
  move: MoveDetail;
  onSelect: (move: MoveDetail) => void;
  isSelected: boolean;
}

export function MoveResultCard({ move, onSelect, isSelected }: Props) {
  const { allPokemon } = usePokemonStore();
  const [expanded, setExpanded] = useState(false);

  // Resolve learner names from cached pokemon data
  const learners = move.learnedByPokemon
    .map((lp) => {
      const cached = allPokemon.find((p) => p.id === lp.id || p.name === lp.name);
      return { ...lp, nameTw: cached?.nameTw || lp.name };
    })
    .sort((a, b) => a.id - b.id);

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isSelected
          ? "border-accent-blue bg-accent-blue/5"
          : "border-surface-border bg-surface-card hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{move.nameTw}</span>
            <span className="text-xs text-gray-500">{move.name}</span>
            <TypeBadge type={move.type} small />
            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-gray-300">
              {DAMAGE_CLASS_LABELS[move.damageClass] ?? move.damageClass}
            </span>
            {move.category && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-gray-400">
                {MOVE_CATEGORY_LABELS[move.category] ?? move.category}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            {move.power && <span>威力 <strong className="text-gray-200">{move.power}</strong></span>}
            {move.accuracy && <span>命中 <strong className="text-gray-200">{move.accuracy}%</strong></span>}
            <span>PP <strong className="text-gray-200">{move.pp}</strong></span>
            {move.priority !== 0 && (
              <span>優先度 <strong className={move.priority > 0 ? "text-accent-green" : "text-accent-red"}>{move.priority > 0 ? `+${move.priority}` : move.priority}</strong></span>
            )}
          </div>

          {move.effect && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{move.effect}</p>
          )}
        </div>

        <button
          onClick={() => onSelect(move)}
          className="text-xs px-2 py-1 rounded border border-surface-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors shrink-0"
        >
          詳情
        </button>
      </div>

      {/* Learners */}
      <div className="mt-2 border-t border-surface-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">可學習：{learners.length} 隻</span>
          {learners.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-accent-blue hover:text-blue-300 transition-colors"
            >
              {expanded ? "收起 ▲" : `展開全部 ▼`}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {(expanded ? learners : learners.slice(0, 10)).map((lp) => (
            <span
              key={lp.id}
              className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-gray-300"
              title={lp.name}
            >
              {lp.nameTw}
            </span>
          ))}
          {!expanded && learners.length > 10 && (
            <span className="text-xs text-gray-500">+{learners.length - 10}</span>
          )}
        </div>
      </div>
    </div>
  );
}
