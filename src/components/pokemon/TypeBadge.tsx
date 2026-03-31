import { TYPE_LABELS } from '../../constants/types';
import { getTypeIconUrl } from '../../constants/typeIcons';

interface TypeBadgeProps {
  type: string;
  small?: boolean;
  /** Show only the icon (no text label) */
  iconOnly?: boolean;
  className?: string;
}

export function TypeBadge({ type, small = false, iconOnly = false, className = '' }: TypeBadgeProps) {
  const iconUrl = getTypeIconUrl(type);
  const label = TYPE_LABELS[type] ?? type;

  if (iconOnly) {
    return (
      <span
        className={`type-${type} inline-flex items-center justify-center rounded ${small ? 'w-5 h-5' : 'w-6 h-6'} ${className}`}
        style={{ border: '1px solid rgba(255,255,255,0.4)' }}
      >
        {iconUrl && <img src={iconUrl} alt={label} className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} style={{ imageRendering: 'auto' }} />}
      </span>
    );
  }

  return (
    <span className={`flex items-stretch rounded overflow-hidden ${className}`} style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
      <span className={`type-${type} flex items-center justify-center ${small ? 'px-1' : 'px-1.5'}`}>
        {iconUrl && <img src={iconUrl} alt={label} className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} style={{ imageRendering: 'auto' }} />}
      </span>
      <span
        className={`flex-1 flex items-center justify-center bg-[#1a1d27] text-white font-medium ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-1.5 py-0.5'}`}
      >
        {label}
      </span>
    </span>
  );
}
