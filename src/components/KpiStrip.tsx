import type { MetricBucket } from '../types/health'
import {
  emptyRate,
  formatNumber,
  formatPercent,
  fullRate,
  healthScore,
  occupancyRate,
  totalCartons,
} from '../lib/metrics'

interface KpiStripProps {
  overall: MetricBucket
}

function KpiCell({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <div className="border-r border-mck-line px-4 py-3 last:border-r-0 md:px-5">
      <div className="text-[11px] font-semibold tracking-section text-mck-gray uppercase">
        {title}
      </div>
      <div className="kpi-num mt-2 font-serif text-[28px] font-semibold leading-none text-mck-navy md:text-[32px]">
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[18px] leading-snug text-mck-gray">{hint}</div> : null}
    </div>
  )
}

export function KpiStrip({ overall }: KpiStripProps) {
  return (
    <section className="mck-panel mb-8 grid grid-cols-2 xl:grid-cols-6">
      <KpiCell
        title="Total Channels"
        value={formatNumber(overall.channels)}
        hint="HB.A + HB.B"
      />
      <KpiCell
        title="Full"
        value={formatNumber(overall.full)}
        hint={formatPercent(fullRate(overall))}
      />
      <KpiCell
        title="Half"
        value={formatNumber(overall.half)}
        hint={`${formatPercent(overall.half / (overall.channels || 1))} · 1–11 slots`}
      />
      <KpiCell
        title="Empty"
        value={formatNumber(overall.empty)}
        hint={formatPercent(emptyRate(overall))}
      />
      <KpiCell
        title="Occupancy"
        value={formatPercent(occupancyRate(overall))}
        hint={`${formatNumber(overall.loadedSlots)} slots used`}
      />
      <KpiCell
        title="Carton Qty"
        value={formatNumber(totalCartons(overall))}
        hint={`S ${formatNumber(overall.cartonS)} · M ${formatNumber(overall.cartonM)} · L ${formatNumber(overall.cartonL)}`}
      />
      <span className="sr-only">Health {formatPercent(healthScore(overall))}</span>
    </section>
  )
}
