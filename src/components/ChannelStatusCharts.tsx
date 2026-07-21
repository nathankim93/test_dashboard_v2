import type { ReactNode } from 'react'
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
import { STATUS_COLORS } from '../types/health'
import {
  formatNumber,
  formatPercent,
  occupancyRate,
  toPercentStatusData,
  toStatusChartData,
} from '../lib/metrics'
import { SectionHead } from './SectionHead'

interface ChannelStatusChartsProps {
  number: string
  title: string
  subtitle: string
  series: Array<{ label: string; bucket: MetricBucket }>
  right?: ReactNode
}

export function ChannelStatusCharts({
  number,
  title,
  subtitle,
  series,
  right,
}: ChannelStatusChartsProps) {
  const absolute = series.map((item) => toStatusChartData(item.bucket, item.label))
  const percent = series.map((item) => toPercentStatusData(item.bucket, item.label))

  return (
    <section className="mck-panel mb-8 p-5 md:p-6">
      <SectionHead number={number} title={title} subtitle={subtitle} right={right} />

      <div className="grid gap-8 xl:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-section text-mck-gray uppercase">
            Channel Qty
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absolute} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#53565A', fontSize: 11 }}
                  axisLine={{ stroke: '#D9DDE3' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#53565A', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
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
                <Bar dataKey="Full" stackId="status" fill={STATUS_COLORS.full} maxBarSize={56} />
                <Bar dataKey="Half" stackId="status" fill={STATUS_COLORS.half} maxBarSize={56} />
                <Bar dataKey="Empty" stackId="status" fill={STATUS_COLORS.empty} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-section text-mck-gray uppercase">
            Mix %
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={percent} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#53565A', fontSize: 11 }}
                  axisLine={{ stroke: '#D9DDE3' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#53565A', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{
                    border: '1px solid #D9DDE3',
                    background: '#fff',
                    fontSize: 12,
                    boxShadow: 'none',
                  }}
                  cursor={{ fill: 'rgba(0,169,206,0.06)' }}
                />
                <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: '#53565A' }} />
                <Bar dataKey="Full" stackId="pct" fill={STATUS_COLORS.full} maxBarSize={56} />
                <Bar dataKey="Half" stackId="pct" fill={STATUS_COLORS.half} maxBarSize={56} />
                <Bar dataKey="Empty" stackId="pct" fill={STATUS_COLORS.empty} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px bg-mck-line">
        {series.map((item) => (
          <div key={item.label} className="bg-white px-3 py-2.5">
            <div className="text-[16px] font-semibold tracking-wider text-mck-gray uppercase">
              {item.label}
            </div>
            <div className="kpi-num mt-1 text-[21px] font-semibold text-mck-navy">
              Occupancy {formatPercent(occupancyRate(item.bucket))} ·{' '}
              {formatNumber(item.bucket.channels)} ch
            </div>
            <div className="mt-1 flex gap-3 text-[18px] text-mck-gray">
              <span>F {formatNumber(item.bucket.full)}</span>
              <span>H {formatNumber(item.bucket.half)}</span>
              <span>E {formatNumber(item.bucket.empty)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
