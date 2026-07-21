export type HighbayFilter = 'total' | 'HB.A' | 'HB.B'
export type LocationFilter = 'total' | 'normal' | 'tall'
export type CartonSizeFilter = 'total' | 'S' | 'M' | 'L'

export const HIGHBAY_FILTER_OPTIONS: Array<{ value: HighbayFilter; label: string }> = [
  { value: 'total', label: 'Total' },
  { value: 'HB.A', label: 'HB.A' },
  { value: 'HB.B', label: 'HB.B' },
]

export const LOCATION_FILTER_OPTIONS: Array<{ value: LocationFilter; label: string }> = [
  { value: 'total', label: 'Total' },
  { value: 'normal', label: 'Normal' },
  { value: 'tall', label: 'Tall' },
]

export const CARTON_SIZE_FILTER_OPTIONS: Array<{ value: CartonSizeFilter; label: string }> = [
  { value: 'total', label: 'Total' },
  { value: 'S', label: 'S(3/12)' },
  { value: 'M', label: 'M(4/12)' },
  { value: 'L', label: 'L(6/12)' },
]
