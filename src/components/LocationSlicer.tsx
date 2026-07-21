import type { LocationFilter } from '../types/filters'
import { LOCATION_FILTER_OPTIONS } from '../types/filters'

interface LocationSlicerProps {
  value: LocationFilter
  onChange: (value: LocationFilter) => void
}

export function LocationSlicer({ value, onChange }: LocationSlicerProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold tracking-section text-mck-gray uppercase">
        Location
      </span>
      <div className="flex flex-wrap gap-1">
        {LOCATION_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`slicer-btn ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
