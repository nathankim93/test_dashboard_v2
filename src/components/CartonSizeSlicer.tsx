import type { CartonSizeFilter } from '../types/filters'
import { CARTON_SIZE_FILTER_OPTIONS } from '../types/filters'

interface CartonSizeSlicerProps {
  value: CartonSizeFilter
  onChange: (value: CartonSizeFilter) => void
}

export function CartonSizeSlicer({ value, onChange }: CartonSizeSlicerProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold tracking-section text-mck-gray uppercase">
        Carton Size
      </span>
      <div className="flex flex-wrap gap-1">
        {CARTON_SIZE_FILTER_OPTIONS.map((option) => (
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
