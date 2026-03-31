import { StatKey } from "../../types/pokemon";
import { STAT_LABELS, STAT_COLORS, DEFAULT_STAT_RANGES, STAT_MIN, STAT_MAX } from "../../constants/stats";
import { usePokemonStore } from "../../stores/usePokemonStore";
import * as Slider from "@radix-ui/react-slider";

interface Props {
  statKey: StatKey;
}

export function StatRangeFilter({ statKey }: Props) {
  const { filterState, setStatRange } = usePokemonStore();
  const [min, max] = filterState.statRanges[statKey];
  const [defaultMin, defaultMax] = DEFAULT_STAT_RANGES[statKey];
  const isChanged = min !== defaultMin || max !== defaultMax;
  const color = STAT_COLORS[statKey];
  const statMin = STAT_MIN[statKey];
  const statMax = STAT_MAX[statKey];

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <span className={`text-xs w-8 shrink-0 ${isChanged ? "text-white font-medium" : "text-gray-400"} ${statKey === "total" ? "font-bold" : ""}`}>
        {STAT_LABELS[statKey]}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="w-12 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
          value={min}
          min={statMin}
          max={max}
          onChange={(e) => setStatRange(statKey, [Number(e.target.value), max])}
        />
        <span className="text-gray-500 text-xs">-</span>
        <input
          type="number"
          className="w-12 bg-surface-border text-xs text-center text-white rounded px-1 py-0.5 [appearance:textfield]"
          value={max}
          min={min}
          max={statMax}
          onChange={(e) => setStatRange(statKey, [min, Number(e.target.value)])}
        />
      </div>
      <div className="flex-1 min-w-[80px]">
        <Slider.Root
          min={statMin}
          max={statMax}
          step={1}
          value={[min, max]}
          onValueChange={([newMin, newMax]) => setStatRange(statKey, [newMin, newMax])}
          className="relative flex items-center select-none h-4"
        >
          <Slider.Track className="relative bg-surface-border rounded-full h-1 flex-1">
            <Slider.Range
              className="absolute h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer"
            style={{ backgroundColor: color, borderColor: color }}
          />
          <Slider.Thumb
            className="block w-3 h-3 rounded-full border-2 outline-none cursor-pointer"
            style={{ backgroundColor: color, borderColor: color }}
          />
        </Slider.Root>
      </div>
    </div>
  );
}
