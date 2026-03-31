import { PokemonSummary, MoveDetail } from '../../types/pokemon';
import { TYPE_LABELS } from '../../constants/types';
import { getTypeIconUrl } from '../../constants/typeIcons';
import { getAvatarUrl, getAvatarFallbackUrl } from '../../utils/avatar';
import { getAbilityNameTw } from '../../constants/abilityNames';
import { getPokemonNameTw, applyFormPrefix } from '../../utils/pokemonNames';
import { RESTRICTED_LEGENDARY_IDS } from '../../constants/restrictedLegendaries';

interface Props {
  pokemon: PokemonSummary;
  onClick: (p: PokemonSummary) => void;
  moveFilter?: MoveDetail[];
}

/** Full-width type badge for table cells */
function TypeCellBadge({ type }: { type: string }) {
  const iconUrl = getTypeIconUrl(type);
  const label = TYPE_LABELS[type] ?? type;
  return (
    <div className="flex items-stretch w-full overflow-hidden rounded" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
      <div className={`type-${type} flex items-center justify-center px-1.5 shrink-0`}>
        {iconUrl && <img src={iconUrl} alt="" className="w-3.5 h-3.5 shrink-0" />}
      </div>
      <div className="flex-1 flex items-center justify-center bg-[#1a1d27] text-white text-xs font-medium px-1 py-1">
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Resolve ability display name: JSON map > stored nameTw > API name */
function resolveAbilityName(ability: { name: string; nameTw: string }): string {
  const fromMap = getAbilityNameTw(ability.name);
  if (fromMap) return fromMap;
  if (ability.nameTw && ability.nameTw !== ability.name) return ability.nameTw;
  return ability.name;
}

// Pokemon whose hyphenated API names are base names, not form variants
const NO_FORM_LABEL_NAMES = new Set([
  'nidoran-f',
  'nidoran-m',
  'mr-mime',
  'ho-oh',
  'mime-jr',
  'jangmo-o',
  'hakamo-o',
  'kommo-o',
  'tapu-koko',
  'tapu-lele',
  'tapu-bulu',
  'tapu-fini',
  'mr-rime',
  'porygon-z',
  'type-null',
  'wo-chien',
  'chien-pao',
  'ting-lu',
  'chi-yu'
]);

const REGIONAL_LABELS: Record<string, string> = {
  alola: '阿羅拉',
  galar: '伽勒爾',
  hisui: '洗翠',
  paldea: '帕底亞'
};

// Exact API name → display label
const FORM_LABEL_MAP: Record<string, string> = {
  // Deoxys
  'deoxys-normal': '普通型態',
  'deoxys-attack': '攻擊型態',
  'deoxys-defense': '防禦型態',
  'deoxys-speed': '速度型態',
  // Wormadam
  'wormadam-plant': '草木蓑衣',
  'wormadam-sandy': '沙土蓑衣',
  'wormadam-trash': '垃圾蓑衣',
  // Castform
  'castform-sunny': '太陽的樣子',
  'castform-rainy': '雨水的樣子',
  'castform-snowy': '雪雲的樣子',
  // Pumpkaboo (南瓜精)
  'pumpkaboo-average': '普通',
  'pumpkaboo-small': '小型',
  'pumpkaboo-large': '大型',
  'pumpkaboo-super': '特大型',
  // Gourgeist (南瓜怪人)
  'gourgeist-average': '普通',
  'gourgeist-small': '小型',
  'gourgeist-large': '大型',
  'gourgeist-super': '特大型',
  // Rotom
  'rotom-heat': '加熱型態',
  'rotom-wash': '清洗型態',
  'rotom-frost': '冷凍型態',
  'rotom-fan': '旋轉型態',
  'rotom-mow': '剪草型態',
  // Giratina
  'giratina-altered': '變換型態',
  'giratina-origin': '起源型態',
  // Shaymin
  'shaymin-land': '大地型態',
  'shaymin-sky': '天空型態',
  // Dialga / Palkia
  'dialga-origin': '起源型態',
  'palkia-origin': '起源型態',
  // Tauros Paldea
  'tauros-paldea-combat': '鬥戰種',
  'tauros-paldea-blaze': '火熾種',
  'tauros-paldea-aqua': '水瀾種',
  'tauros-paldea-combat-breed': '鬥戰種',
  'tauros-paldea-blaze-breed': '火熾種',
  'tauros-paldea-aqua-breed': '水瀾種',
  // Forces of Nature
  'tornadus-incarnate': '',
  'tornadus-therian': '靈獸',
  'thundurus-incarnate': '',
  'thundurus-therian': '靈獸',
  'landorus-incarnate': '',
  'landorus-therian': '靈獸',
  'enamorus-incarnate': '',
  'enamorus-therian': '靈獸',
  // Kyurem
  'kyurem-black': '黑色',
  'kyurem-white': '白色',
  // Darmanitan
  'darmanitan-standard': '',
  'darmanitan-zen': '禪模式',
  'darmanitan-galar-zen': '禪模式',
  // Greninja
  'greninja-ash': '小智版',
  // Meloetta
  'meloetta-aria': '',
  'meloetta-pirouette': '歌舞型態',
  // Keldeo
  'keldeo-ordinary': '',
  // Aegislash
  'aegislash-shield': '',
  'aegislash-blade': '刀劍型態',
  // Zygarde
  'zygarde-50': '',
  'zygarde-10': '10%',
  'zygarde-complete': '完全',
  // Hoopa
  'hoopa-confined': '',
  'hoopa-unbound': '解放',
  // Wishiwashi
  'wishiwashi-solo': '單獨的樣子',
  'wishiwashi-school': '魚群的樣子',
  // Lycanroc
  'lycanroc-midday': '',
  'lycanroc-midnight': '午夜',
  'lycanroc-dusk': '黃昏',
  // Rockruff
  'rockruff-own-tempo': '特殊',
  // Mimikyu
  'mimikyu-disguised': '',
  // Minior
  'minior-red': '核心型態',
  // Necrozma
  'necrozma-dusk-mane': '黃昏之鬃',
  'necrozma-dawn-wings': '拂曉之翼',
  'necrozma-ultra': '究極',
  // Meowstic
  'meowstic-male': '雄性',
  'meowstic-female': '雌性',
  // Morpeko
  'morpeko-full-belly': '',
  'morpeko-hangry': '空腹',
  // Eiscue
  'eiscue-ice': '',
  'eiscue-noice': '融冰頭',
  // Indeedee
  'indeedee-male': '雄性',
  'indeedee-female': '雌性',
  // Calyrex
  'calyrex-ice': '冰驅',
  'calyrex-shadow': '暗影',
  // Urshifu
  'urshifu-single-strike': '一擊流',
  'urshifu-rapid-strike': '連擊流',
  // Zacian / Zamazenta
  'zacian-hero-of-many-battles': '',
  'zacian-crowned': '王冠',
  'zamazenta-hero-of-many-battles': '',
  'zamazenta-crowned': '王冠',
  // Eternatus
  'eternatus-eternamax': '無極巨化',
  // Basculegion
  'basculegion-male': '雄性',
  'basculegion-female': '雌性',
  // Palafin
  'palafin-zero': '',
  'palafin-hero': '英雄',
  // Oinkologne
  'oinkologne-male': '雄性',
  'oinkologne-female': '雌性',
  // Tatsugiri
  'tatsugiri-curly': '',
  'tatsugiri-droopy': '低垂',
  'tatsugiri-stretchy': '拉伸',
  // Maushold
  'maushold-family-of-four': '',
  // Gimmighoul
  'gimmighoul-chest': '',
  'gimmighoul-roaming': '遊蕩',
  // Oricorio (花舞鳥)
  'oricorio-baile':   '熱辣熱辣風格',
  'oricorio-pom-pom': '啪滋啪滋風格',
  'oricorio-pau':     '呼拉呼拉風格',
  'oricorio-sensu':   '輕盈輕盈風格',
  // Ogerpon
  'ogerpon-teal-mask': '',
  'ogerpon-wellspring-mask': '湧泉面具',
  'ogerpon-hearthflame-mask': '爐火面具',
  'ogerpon-cornerstone-mask': '磐石面具',
  // Terapagos
  'terapagos-normal': '',
  'terapagos-terastal': '太晶',
  'terapagos-stellar': '星晶',
  // Koraidon / Miraidon
  'koraidon-apex-build': '',
  'koraidon-limited-build': '低功率',
  'koraidon-sprinting-build': '奔跑',
  'koraidon-swimming-build': '游泳',
  'koraidon-gliding-build': '滑翔',
  'miraidon-ultimate-mode': '',
  'miraidon-low-power-mode': '低功率',
  'miraidon-drive-mode': '奔跑',
  'miraidon-aquatic-mode': '游泳',
  'miraidon-glide-mode': '滑翔',
};

function getFormLabel(name: string): string {
  if (NO_FORM_LABEL_NAMES.has(name)) return '';

  // Mega / Primal – req title
  if (name.includes('-primal')) return '原始回歸';
  const megaSplit = name.match(/-mega-([xyz])$/i);
  if (megaSplit) return `超級進化${megaSplit[1].toUpperCase()}`;
  if (name.includes('-mega')) return '超級進化';

  if (!name.includes('-')) return '';

  if (name in FORM_LABEL_MAP) return FORM_LABEL_MAP[name];

  // Regional suffix fallback for forms not in the explicit map
  const parts = name.split('-');
  for (let i = parts.length - 1; i >= Math.max(0, parts.length - 2); i--) {
    if (REGIONAL_LABELS[parts[i]]) return REGIONAL_LABELS[parts[i]];
  }

  return '';
}

function AbilityCellBadge({ name }: { name: string | null }) {
  if (!name) {
    return <div className="text-gray-600 text-xs text-center w-full">—</div>;
  }
  return (
    <div
      className="flex items-center justify-center w-full px-1 py-1 text-xs text-white rounded"
      style={{
        border: '1px solid rgba(230,126,34,0.5)',
        backgroundColor: 'rgba(230,126,34,0.15)'
      }}
    >
      {name}
    </div>
  );
}

const tdCenter = 'px-2 py-1.5 text-center text-xs text-white align-middle';
const tdBorder = 'border-l border-surface-border';

export function PokemonRow({ pokemon, onClick, moveFilter = [] }: Props) {
  const s = pokemon.stats;
  const avatarUrl = getAvatarUrl(pokemon.name);
  const fallbackUrl = getAvatarFallbackUrl(pokemon.name);
  const nameTw = applyFormPrefix(pokemon.name, getPokemonNameTw(pokemon.speciesId) || pokemon.nameTw);
  const isRestricted = RESTRICTED_LEGENDARY_IDS.has(pokemon.speciesId);

  // Form label with ability-based overrides
  let formLabel = getFormLabel(pokemon.name);
  // req 7: Basculin – determine stripe label from first regular ability
  if (pokemon.name.startsWith('basculin')) {
    const firstAbility = pokemon.abilities.find((a) => !a.isHidden);
    if (firstAbility?.name === 'reckless') formLabel = '紅條紋的樣子';
    else if (firstAbility?.name === 'rock-head') formLabel = '藍條紋的樣子';
    else if (firstAbility?.name === 'rattled') formLabel = '白條紋的樣子';
  }
  // req 1: Suppress label for paradox pokemon (古代活性 / 夸克充能)
  if (pokemon.abilities.some((a) => a.name === 'protosynthesis' || a.name === 'quark-drive')) {
    formLabel = '';
  }

  // Split abilities into regular and hidden
  const regularAbilities = pokemon.abilities.filter((a) => !a.isHidden);
  const hiddenAbility = pokemon.abilities.find((a) => a.isHidden) ?? null;

  return (
    <tr className="transition-colors border-b cursor-pointer border-surface-border hover:bg-surface-hover" onClick={() => onClick(pokemon)}>
      {/* 編號 */}
      <td className={`${tdCenter} text-gray-400`}>#{String(pokemon.speciesId).padStart(4, '0')}</td>

      {/* 圖像 */}
      <td className={`${tdCenter} ${tdBorder}`} style={{ width: 40 }}>
        <img
          src={avatarUrl}
          alt={nameTw}
          className="object-contain w-8 h-8 mx-auto"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            const fallbackAbsolute = new URL(fallbackUrl, window.location.href).href;
            if (img.src !== fallbackAbsolute) {
              img.src = fallbackUrl;
            } else {
              img.style.display = 'none';
            }
          }}
        />
      </td>

      {/* 名稱（含形態小字） */}
      <td className="px-2 py-1.5 align-middle" style={{ minWidth: 120 }}>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-sm font-medium leading-tight text-white">{nameTw}</span>
          {pokemon.isLegendary &&
            (isRestricted ? (
              <span className="text-[10px] px-1 py-0.5 rounded bg-red-700/30 text-red-400 border border-red-700/50 leading-none">S神</span>
            ) : (
              <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 leading-none">
                A神
              </span>
            ))}
          {pokemon.isMythical && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-purple-600/30 text-purple-400 border border-purple-600/50 leading-none">
              幻獸
            </span>
          )}
          {!pokemon.isLegendary && !pokemon.isMythical && pokemon.abilities.some((a) =>
            a.name === 'protosynthesis' || a.name === 'quark-drive' || a.name === 'beast-boost'
          ) && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 leading-none">
              A神
            </span>
          )}
        </div>
        {formLabel && <div className="text-[10px] text-gray-400 leading-tight">{formLabel}</div>}
      </td>

      {/* ── 屬性 (colSpan conditional) ── */}
      {pokemon.types.length === 1 ? (
        <td colSpan={2} className={`px-1.5 py-1 align-middle ${tdBorder}`} style={{ minWidth: 148 }}>
          <TypeCellBadge type={pokemon.types[0]} />
        </td>
      ) : (
        <>
          <td className={`px-1.5 py-1 align-middle ${tdBorder}`} style={{ minWidth: 74 }}>
            <TypeCellBadge type={pokemon.types[0]} />
          </td>
          <td className="px-1.5 py-1 align-middle" style={{ minWidth: 74 }}>
            <TypeCellBadge type={pokemon.types[1]} />
          </td>
        </>
      )}

      {/* ── 特性 ── */}
      {regularAbilities.length <= 1 ? (
        <td colSpan={2} className={`px-1.5 py-1 align-middle ${tdBorder}`}>
          <AbilityCellBadge name={regularAbilities[0] ? resolveAbilityName(regularAbilities[0]) : null} />
        </td>
      ) : (
        <>
          <td className={`px-1.5 py-1 align-middle ${tdBorder}`}>
            <AbilityCellBadge name={resolveAbilityName(regularAbilities[0])} />
          </td>
          <td className="px-1.5 py-1 align-middle">
            <AbilityCellBadge name={resolveAbilityName(regularAbilities[1])} />
          </td>
        </>
      )}

      {/* 隱藏特性 */}
      <td className="px-1.5 py-1 align-middle">
        <AbilityCellBadge name={hiddenAbility ? resolveAbilityName(hiddenAbility) : null} />
      </td>

      {/* ── 種族值 ── */}
      <td className={`${tdCenter} ${tdBorder}`} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.hp}
      </td>
      <td className={tdCenter} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.attack}
      </td>
      <td className={tdCenter} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.defense}
      </td>
      <td className={tdCenter} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.spAtk}
      </td>
      <td className={tdCenter} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.spDef}
      </td>
      <td className={tdCenter} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        {s.speed}
      </td>
      <td className={`${tdCenter} text-gray-200`} style={{ backgroundColor: 'rgba(98,89,196,0.08)' }}>
        <strong>{s.total}</strong>
      </td>

      {/* 體重 / 身高 */}
      <td className={`${tdCenter} text-gray-400 ${tdBorder}`}>{(pokemon.weight / 10).toFixed(1)}</td>
      <td className={`${tdCenter} text-gray-400`}>{(pokemon.height / 10).toFixed(1)}</td>

      {/* 可學習的招式（僅在有招式篩選時顯示） */}
      {moveFilter.length > 0 && (
        <td className={`px-2 py-1 align-middle ${tdBorder}`}>
          <div className="flex flex-wrap gap-1">
            {moveFilter.map((move) => {
              const canLearn = move.learnedByPokemon.some(
                (lp) => lp.id === pokemon.id || lp.name === pokemon.name
              );
              return canLearn ? (
                <span
                  key={move.name}
                  className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-blue-300 border border-accent-blue/30 whitespace-nowrap"
                >
                  {move.nameTw}
                </span>
              ) : null;
            })}
          </div>
        </td>
      )}
    </tr>
  );
}
