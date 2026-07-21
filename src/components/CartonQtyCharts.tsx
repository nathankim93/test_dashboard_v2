import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MetricBucket } from '../types/health'
import { CARTON_COLORS } from '../types/health'
import { formatNumber, toCartonChartData, totalCartons } from '../lib/metrics'
import { SectionHead } from './SectionHead'

interface CartonQtyChartsProps {
  number: string
  title: string
  subtitle: string
  series: Array<{ label: string; bucket: MetricBucket }>
}

export function CartonQtyCharts({ number, title, subtitle, series }: CartonQtyChartsProps) {
  const data = series.map((item) => toCartonChartData(item.bucket, item.label))

  return (
    <section className="mck-panel mb-8 p-5 md:p-6">
      <SectionHead
        number={number}
        title={title}
        subtitle={subtitle}
        right={
          <span className="text-[11px] font-semibold tracking-section text-mck-gray uppercase">
            S (3/12) · M (4/12) · L (6/12)
          </span>
        }
      />

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#53565A', fontSize: 11 }}
              axisLine={{ stroke: '#D9DDE3' }}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#53565A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => formatNumber(Number(value))}
              contentStyle={{
                border: '1px solid #D9DDE3',
                background: '#fff',
                fontSize: 12,
                boxShadow: 'none',
              }}
              cursor={{ fill: 'rgba(0,169,206,0.06)' }}
            />
            <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: '#53565A' }} />
            <Bar dataKey="S" fill={CARTON_COLORS.S} maxBarSize={48} />
            <Bar dataKey="M" fill={CARTON_COLORS.M} maxBarSize={48} />
            <Bar dataKey="L" fill={CARTON_COLORS.L} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px bg-mck-line">
        {series.map((item) => {
          const total = totalCartons(item.bucket)
          return (
            <div key={item.label} className="bg-white px-3 py-2.5">
              <div className="text-[16px] font-semibold tracking-wider text-mck-gray uppercase">
                {item.label}
              </div>
              <div className="kpi-num mt-1 font-serif text-[30px] font-semibold text-mck-navy">
                {formatNumber(total)}
              </div>
              <div className="mt-1 text-[18px] text-mck-gray">
                S {formatNumber(item.bucket.cartonS)} · M {formatNumber(item.bucket.cartonM)} · L{' '}
                {formatNumber(item.bucket.cartonL)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
