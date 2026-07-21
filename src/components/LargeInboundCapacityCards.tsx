import type { MetricBucket } from '../types/health'
import { computeLargeInboundCapacity, formatNumber } from '../lib/metrics'
import { SectionHead } from './SectionHead'

interface LargeInboundCapacityCardsProps {
  series: Array<{ label: string; bucket: MetricBucket }>
  scopeLabel: string
}

export function LargeInboundCapacityCards({
  series,
  scopeLabel,
}: LargeInboundCapacityCardsProps) {
  return (
    <section className="mck-panel mb-8 p-5 md:p-6">
      <SectionHead
        number="03"
        title="Large Carton 입고 가능 수량 — HB.A vs HB.B"
        subtitle={`${scopeLabel} · (Large Channel + Empty) × 93% × 2 − 현재 Large 수량`}
      />

      <div className="grid gap-px bg-mck-line md:grid-cols-2">
        {series.map((item) => {
          const cap = computeLargeInboundCapacity(item.bucket)
          return (
            <article key={item.label} className="bg-white px-5 py-4">
              <div className="text-[11px] font-semibold tracking-section text-mck-gray uppercase">
                {item.label}
              </div>
              <div className="kpi-num mt-2 font-serif text-[32px] font-semibold leading-none text-mck-navy">
                {formatNumber(Math.round(cap.availableQty))}
              </div>
              <div className="mt-1.5 text-[18px] font-semibold text-mck-teal">입고 가능 수량</div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[18px] text-mck-gray">
                <div className="flex justify-between gap-2">
                  <dt>Large Ch</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(cap.largeChannels)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Empty Ch</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(cap.emptyChannels)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>L Full</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(cap.largeFull)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>L Half</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(cap.largeHalf)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>전체 가능</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(Math.round(cap.totalCapacity))}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>현재 수량</dt>
                  <dd className="kpi-num font-medium text-mck-navy">
                    {formatNumber(Math.round(cap.currentQty))}
                  </dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}
