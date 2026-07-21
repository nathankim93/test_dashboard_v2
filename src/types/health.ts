export type ChannelStatus = 'full' | 'half' | 'empty'
export type LocationType = 'tall' | 'normal'
export type Highbay = 'HB.A' | 'HB.B'

export interface MetricBucket {
  channels: number
  full: number
  half: number
  empty: number
  cartonS: number
  cartonM: number
  cartonL: number
  loadedSlots: number
  largeChannels: number
  largeFull: number
  largeHalf: number
}

export interface HealthDataset {
  generatedAt: string
  sourceFile: string
  totalChannels: number
  tallLevels: string[]
  definitions: {
    full: string
    half: string
    empty: string
    tallLevels: string[]
    normal: string
  }
  summary: {
    overall: MetricBucket
    byHighbay: Record<Highbay, MetricBucket>
    byLocation: Record<LocationType, MetricBucket>
    matrix: Record<Highbay, Record<LocationType, MetricBucket>>
    byCartonSize?: Record<
      'S' | 'M' | 'L',
      {
        byHighbay: Record<Highbay, MetricBucket>
        matrix: Record<Highbay, Record<LocationType, MetricBucket>>
      }
    >
  }
  warehouses: Array<{
    name: string
    highbay: Highbay | 'OTHER'
    channelCount: number
  }>
}

export const MAX_SLOTS = 12

export const STATUS_COLORS = {
  full: '#051C2C',
  half: '#00A9CE',
  empty: '#A8B0B8',
} as const

export const CARTON_COLORS = {
  S: '#051C2C',
  M: '#00A9CE',
  L: '#7A8694',
} as const
