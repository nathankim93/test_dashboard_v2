import type { MetricBucket } from '../types/health'
import type { Highbay, LocationType } from '../types/health'
import type { CartonSizeFilter, HighbayFilter, LocationFilter } from '../types/filters'
import { MAX_SLOTS } from '../types/health'

type CartonSizeSlice = {
  byHighbay: Record<Highbay, MetricBucket>
  matrix: Record<Highbay, Record<LocationType, MetricBucket>>
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function occupancyRate(bucket: MetricBucket): number {
  const capacity = bucket.channels * MAX_SLOTS
  if (capacity === 0) return 0
  return bucket.loadedSlots / capacity
}

export function fullRate(bucket: MetricBucket): number {
  if (bucket.channels === 0) return 0
  return bucket.full / bucket.channels
}

export function emptyRate(bucket: MetricBucket): number {
  if (bucket.channels === 0) return 0
  return bucket.empty / bucket.channels
}

export function healthScore(bucket: MetricBucket): number {
  // Weighted health: prioritize full fill and penalize empty channels
  return occupancyRate(bucket) * 0.6 + fullRate(bucket) * 0.3 + (1 - emptyRate(bucket)) * 0.1
}

export function statusShare(bucket: MetricBucket) {
  const total = bucket.channels || 1
  return {
    full: bucket.full / total,
    half: bucket.half / total,
    empty: bucket.empty / total,
  }
}

export function totalCartons(bucket: MetricBucket): number {
  return bucket.cartonS + bucket.cartonM + bucket.cartonL
}

export function toStatusChartData(bucket: MetricBucket, label: string) {
  return {
    name: label,
    Full: bucket.full,
    Half: bucket.half,
    Empty: bucket.empty,
    channels: bucket.channels,
  }
}

export function toCartonChartData(bucket: MetricBucket, label: string) {
  return {
    name: label,
    S: bucket.cartonS,
    M: bucket.cartonM,
    L: bucket.cartonL,
    total: totalCartons(bucket),
  }
}

export function toPercentStatusData(bucket: MetricBucket, label: string) {
  const share = statusShare(bucket)
  const full = Number((share.full * 100).toFixed(1))
  const half = Number((share.half * 100).toFixed(1))
  const empty = Number((100 - full - half).toFixed(1))
  return {
    name: label,
    Full: full,
    Half: half,
    Empty: Math.max(0, empty),
  }
}

export function getTallNormalSeries(
  filter: HighbayFilter,
  byLocation: Record<LocationType, MetricBucket>,
  matrix: Record<Highbay, Record<LocationType, MetricBucket>>,
): Array<{ label: string; bucket: MetricBucket }> {
  const source =
    filter === 'total'
      ? byLocation
      : matrix[filter]

  return [
    { label: 'Tall', bucket: source.tall },
    { label: 'Normal', bucket: source.normal },
  ]
}

export function getHighbayFilterLabel(filter: HighbayFilter): string {
  if (filter === 'total') return 'Total (HB.A + HB.B)'
  return filter
}

export function getHighbaySeries(
  filter: LocationFilter,
  byHighbay: Record<Highbay, MetricBucket>,
  matrix: Record<Highbay, Record<LocationType, MetricBucket>>,
): Array<{ label: string; bucket: MetricBucket }> {
  if (filter === 'total') {
    return [
      { label: 'HB.A', bucket: byHighbay['HB.A'] },
      { label: 'HB.B', bucket: byHighbay['HB.B'] },
    ]
  }

  return [
    { label: 'HB.A', bucket: matrix['HB.A'][filter] },
    { label: 'HB.B', bucket: matrix['HB.B'][filter] },
  ]
}

export function getChannelQtySeries(
  cartonSizeFilter: CartonSizeFilter,
  locationFilter: LocationFilter,
  byHighbay: Record<Highbay, MetricBucket>,
  matrix: Record<Highbay, Record<LocationType, MetricBucket>>,
  byCartonSize?: Record<'S' | 'M' | 'L', CartonSizeSlice>,
): Array<{ label: string; bucket: MetricBucket }> {
  if (cartonSizeFilter === 'total' || !byCartonSize) {
    return getHighbaySeries(locationFilter, byHighbay, matrix)
  }

  const slice = byCartonSize[cartonSizeFilter]
  return getHighbaySeries(locationFilter, slice.byHighbay, slice.matrix)
}

export function getLocationFilterLabel(filter: LocationFilter): string {
  if (filter === 'total') return 'Total (Tall + Normal)'
  if (filter === 'tall') return 'Tall Location'
  return 'Normal Location'
}

export function getCartonSizeFilterLabel(filter: CartonSizeFilter): string {
  if (filter === 'total') return 'All Carton Sizes'
  if (filter === 'S') return 'S(3/12)'
  if (filter === 'M') return 'M(4/12)'
  return 'L(6/12)'
}

export interface LargeInboundCapacity {
  largeChannels: number
  emptyChannels: number
  largeFull: number
  largeHalf: number
  totalCapacity: number
  currentQty: number
  availableQty: number
}

/**
 * Large Carton inbound capacity:
 * totalCapacity = (largeChannels + emptyChannels) * 0.93 * 2
 * currentQty    = largeFull * 2 + largeHalf
 * availableQty  = max(0, totalCapacity - currentQty)
 */
export function computeLargeInboundCapacity(bucket: MetricBucket): LargeInboundCapacity {
  const largeChannels = bucket.largeChannels ?? 0
  const emptyChannels = bucket.empty
  const largeFull = bucket.largeFull ?? 0
  const largeHalf = bucket.largeHalf ?? 0

  const totalCapacity = (largeChannels + emptyChannels) * 0.93 * 2
  const currentQty = largeFull * 2 + largeHalf
  const availableQty = Math.max(0, totalCapacity - currentQty)

  return {
    largeChannels,
    emptyChannels,
    largeFull,
    largeHalf,
    totalCapacity,
    currentQty,
    availableQty,
  }
}
