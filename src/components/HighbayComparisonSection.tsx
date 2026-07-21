import { useMemo, useState } from 'react'
import type { HealthDataset } from '../types/health'
import type { CartonSizeFilter, LocationFilter } from '../types/filters'
import {
  getCartonSizeFilterLabel,
  getChannelQtySeries,
  getHighbaySeries,
  getLocationFilterLabel,
} from '../lib/metrics'
import { CartonQtyCharts } from './CartonQtyCharts'
import { CartonSizeSlicer } from './CartonSizeSlicer'
import { ChannelStatusCharts } from './ChannelStatusCharts'
import { LargeInboundCapacityCards } from './LargeInboundCapacityCards'
import { LocationSlicer } from './LocationSlicer'

interface HighbayComparisonSectionProps {
  byHighbay: HealthDataset['summary']['byHighbay']
  matrix: HealthDataset['summary']['matrix']
  byCartonSize?: HealthDataset['summary']['byCartonSize']
}

export function HighbayComparisonSection({
  byHighbay,
  matrix,
  byCartonSize,
}: HighbayComparisonSectionProps) {
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('total')
  const [cartonSizeFilter, setCartonSizeFilter] = useState<CartonSizeFilter>('total')

  const channelSeries = useMemo(
    () =>
      getChannelQtySeries(
        cartonSizeFilter,
        locationFilter,
        byHighbay,
        matrix,
        byCartonSize,
      ),
    [cartonSizeFilter, locationFilter, byHighbay, matrix, byCartonSize],
  )

  const locationSeries = useMemo(
    () => getHighbaySeries(locationFilter, byHighbay, matrix),
    [locationFilter, byHighbay, matrix],
  )

  const locationLabel = getLocationFilterLabel(locationFilter)
  const cartonSizeLabel = getCartonSizeFilterLabel(cartonSizeFilter)

  const channelSlicers = (
    <div className="flex flex-col gap-3">
      <CartonSizeSlicer value={cartonSizeFilter} onChange={setCartonSizeFilter} />
      <LocationSlicer value={locationFilter} onChange={setLocationFilter} />
    </div>
  )

  return (
    <div>
      <ChannelStatusCharts
        number="01"
        title="Channel Qty — HB.A vs HB.B"
        subtitle={`${cartonSizeLabel} · ${locationLabel} · Full(12) · Half(1–11) · Empty(0) channel count comparison`}
        series={channelSeries}
        right={channelSlicers}
      />

      <CartonQtyCharts
        number="02"
        title="Carton Qty by Size — HB.A vs HB.B"
        subtitle={`${locationLabel} · Carton size (S / M / L) loaded quantity`}
        series={locationSeries}
      />

      <LargeInboundCapacityCards series={locationSeries} scopeLabel={locationLabel} />
    </div>
  )
}
