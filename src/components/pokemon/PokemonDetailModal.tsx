import { PokemonSummary, StatKey } from '../../types/pokemon';
import { STAT_LABELS } from '../../constants/stats';
import { TypeBadge } from './TypeBadge';
import { StatBar } from './StatBar';
import { useEffect, useRef } from 'react';
import { getAvatarUrl, getAvatarFallbackUrl } from '../../utils/avatar';
import { getAbilityNameTw } from '../../constants/abilityNames';
import { getPokemonNameTw, applyFormPrefix } from '../../utils/pokemonNames';
import { RESTRICTED_LEGENDARY_IDS } from '../../constants/restrictedLegendaries';

const ALL_STATS: StatKey[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed', 'total'];

interface Props {
  pokemon: PokemonSummary;
  onClose: () => void;
}

export function PokemonDetailModal({ pokemon, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameTw = applyFormPrefix(pokemon.name, getPokemonNameTw(pokemon.speciesId) || pokemon.nameTw);
  const isRestricted = RESTRICTED_LEGENDARY_IDS.has(pokemon.speciesId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={handleOverlayClick}>
      <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(pokemon.name)}
              alt={nameTw}
              className="w-16 h-16 object-contain"
              onError={(e) => {
                const img = e.currentTarget;
                const fallback = getAvatarFallbackUrl(pokemon.name);
                if (img.src !== window.location.origin + fallback) {
                  img.src = fallback;
                } else {
                  img.style.display = 'none';
                }
              }}
            />
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-gray-400">#{String(pokemon.speciesId).padStart(4, '0')}</span>
                <h2 className="text-lg font-bold text-white">{nameTw}</h2>
                <span className="text-xs text-gray-500">{pokemon.name}</span>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {pokemon.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
                {pokemon.isLegendary &&
                  (isRestricted ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-700/30 text-red-400 border border-red-700/50">S神</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-600/30 text-yellow-400 border border-yellow-600/50">A神</span>
                  ))}
                {pokemon.isMythical && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-400 border border-purple-600/50">幻獸</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            ✕
          </button>
        </div>

        {/* Info */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">世代</div>
              <div className="text-white font-medium">第 {pokemon.generation} 世代</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">身高</div>
              <div className="text-white font-medium">{(pokemon.height / 10).toFixed(1)} m</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">體重</div>
              <div className="text-white font-medium">{(pokemon.weight / 10).toFixed(1)} kg</div>
            </div>
          </div>

          {/* Abilities */}
          <div>
            <div className="text-xs text-gray-400 mb-2">特性</div>
            <div className="flex flex-wrap gap-2">
              {pokemon.abilities.map((ab) => (
                <span
                  key={ab.name}
                  className={`text-xs px-2 py-1 rounded border ${
                    ab.isHidden
                      ? 'border-purple-500/50 text-purple-300 bg-purple-500/10'
                      : 'border-surface-border text-gray-300 bg-surface-hover'
                  }`}
                >
                  {getAbilityNameTw(ab.name) || ab.nameTw || ab.name}
                  {ab.isHidden && <span className="ml-1 text-purple-400">(隱)</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="text-xs text-gray-400 mb-2">能力值</div>
            <div className="space-y-2">
              {ALL_STATS.map((stat) => (
                <div key={stat} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-10 shrink-0">{STAT_LABELS[stat]}</span>
                  <StatBar statKey={stat} value={pokemon.stats[stat]} />
                </div>
              ))}
            </div>
          </div>

          {/* Shiny sprite */}
          {pokemon.spriteShinyUrl && (
            <div>
              <div className="text-xs text-gray-400 mb-2">異色</div>
              <img src={pokemon.spriteShinyUrl} alt={`${nameTw} 異色`} className="w-16 h-16 object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
