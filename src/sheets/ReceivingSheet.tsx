import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type MetricKey = 'units' | 'cartons'
type BarMode = 'daily' | 'weekly'

type DivBucket = { units: number; cartons: number }
type SeriesRow = {
  date?: string
  week?: string
  label: string
  AP: DivBucket
  FW: DivBucket
  EQ: DivBucket
  total: DivBucket
}

type ReceivingPayload = {
  meta: {
    asOfLabel: string
    weekLabel: string
    updatedAt: string
    recordCount: number
    sourceFile: string
    dateRange: { from: string; to: string }
    divisionLabels: Record<string, string>
  }
  normal: {
    dailySeries: SeriesRow[]
    weeklySeries: SeriesRow[]
    season: Record<string, DivBucket>
  }
  drs: {
    dailySeries: SeriesRow[]
    weeklySeries: SeriesRow[]
    season: Record<string, DivBucket>
  }
  mot: Record<string, DivBucket>
}

const DIV_COLORS = { AP: '#051C2C', FW: '#00A9CE', EQ: '#7A8694' }
const PIE_COLORS = ['#051C2C', '#00A9CE', '#3D5A6C', '#7A8694', '#A8B0B8', '#C5CCD3']

function fmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

function metric(obj: DivBucket | undefined, key: MetricKey) {
  return obj ? obj[key] || 0 : 0
}

function SectionHead({
  number,
  title,
  subtitle,
  right,
}: {
  number: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-mck-line pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-section text-mck-teal">{number}</span>
          <div className="mck-rule" />
        </div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-mck-navy md:text-[28px]">{title}</h2>
        {subtitle ? <p className="kpi-detail-sub mt-1 max-w-2xl text-mck-gray">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

function Slicer({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-section text-mck-gray">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={'slicer-btn ' + (value === o.id ? 'active' : '')}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function QuantityTable({
  series,
  metricKey,
  mode,
  unitLabel,
  variant,
}: {
  series: SeriesRow[]
  metricKey: MetricKey
  mode: BarMode
  unitLabel: string
  variant: 'normal' | 'drs'
}) {
  const isNormal = variant === 'normal'
  const variantLabel = isNormal ? 'Normal' : 'DRS'
  const periodLabel = mode === 'daily' ? 'Date' : 'Week'
  const periodTitle = mode === 'daily' ? 'Daily' : 'Weekly'
  const keyField = mode === 'daily' ? 'date' : 'week'

  const rows = useMemo(() => {
    return (series || [])
      .map((s) => ({
        key: (s[keyField as 'date' | 'week'] as string) || s.label,
        label: s.label,
        total: metric(s.total, metricKey),
        ap: metric(s.AP, metricKey),
        fw: metric(s.FW, metricKey),
        eq: metric(s.EQ, metricKey),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  }, [series, metricKey, keyField])

  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          total: a.total + r.total,
          ap: a.ap + r.ap,
          fw: a.fw + r.fw,
          eq: a.eq + r.eq,
        }),
        { total: 0, ap: 0, fw: 0, eq: 0 },
      ),
    [rows],
  )

  return (
    <div className="mt-6 border-t border-mck-line pt-5">
      <div className="mb-4">
        <h3 className="font-serif text-lg font-semibold text-mck-navy">
          {periodTitle} Quantity Detail — {variantLabel}
        </h3>
        <p className="kpi-detail-note mt-1 text-mck-gray">
          {variantLabel} ({isNormal ? 'Z001' : 'Z010'}) totals by {periodLabel.toLowerCase()} · {unitLabel}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="bg-mck-mist text-[12px] font-semibold uppercase tracking-wider text-mck-gray">
              <th className="px-3 py-2 text-left">{periodLabel}</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">AP</th>
              <th className="px-3 py-2">FW</th>
              <th className="px-3 py-2">EQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-mck-line">
                <td className="px-3 py-2 text-left font-medium text-mck-navy whitespace-nowrap">{r.label}</td>
                <td className="kpi-num px-3 py-2 font-semibold text-mck-navy">{fmt(r.total)}</td>
                <td className="kpi-num px-3 py-2 text-mck-gray">{fmt(r.ap)}</td>
                <td className="kpi-num px-3 py-2 text-mck-gray">{fmt(r.fw)}</td>
                <td className="kpi-num px-3 py-2 text-mck-gray">{fmt(r.eq)}</td>
              </tr>
            ))}
            <tr className="bg-mck-soft font-semibold">
              <td className="px-3 py-2 text-left">Total</td>
              <td className="kpi-num px-3 py-2">{fmt(totals.total)}</td>
              <td className="kpi-num px-3 py-2">{fmt(totals.ap)}</td>
              <td className="kpi-num px-3 py-2">{fmt(totals.fw)}</td>
              <td className="kpi-num px-3 py-2">{fmt(totals.eq)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StackedBars({ series, metricKey }: { series: SeriesRow[]; metricKey: MetricKey }) {
  const data = series.map((s) => ({
    label: s.label,
    AP: metric(s.AP, metricKey),
    FW: metric(s.FW, metricKey),
    EQ: metric(s.EQ, metricKey),
  }))

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke="#E8EEF2" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#53565A', fontSize: 13 }} axisLine={{ stroke: '#D9DDE3' }} tickLine={false} />
          <YAxis tick={{ fill: '#53565A', fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip
            contentStyle={{ border: '1px solid #D9DDE3', fontSize: 13 }}
            formatter={(value) => fmt(Number(value))}
          />
          <Legend iconType="square" wrapperStyle={{ fontSize: 14, color: '#53565A' }} />
          <Bar dataKey="AP" name="AP" stackId="a" fill={DIV_COLORS.AP} maxBarSize={42} />
          <Bar dataKey="FW" name="FW" stackId="a" fill={DIV_COLORS.FW} maxBarSize={42} />
          <Bar dataKey="EQ" name="EQ" stackId="a" fill={DIV_COLORS.EQ} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MixPie({
  dataMap,
  metricKey,
  number,
  title,
  subtitle,
}: {
  dataMap: Record<string, DivBucket>
  metricKey: MetricKey
  number: string
  title: string
  subtitle: string
}) {
  const entries = useMemo(() => {
    const total = Object.values(dataMap || {}).reduce((a, v) => a + metric(v, metricKey), 0)
    return Object.entries(dataMap || {})
      .map(([k, v]) => ({
        name: k,
        value: metric(v, metricKey),
        pct: total ? (metric(v, metricKey) / total) * 100 : 0,
      }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [dataMap, metricKey])

  const total = entries.reduce((a, b) => a + b.value, 0)

  return (
    <div>
      <SectionHead number={number} title={title} subtitle={subtitle} />
      <div className="h-[300px] w-full bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={entries} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={1} stroke="#fff" strokeWidth={2}>
              {entries.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => fmt(Number(value))} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 14, color: '#53565A' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 border border-mck-line bg-white md:grid-cols-3">
        {entries.map((s) => (
          <div key={s.name} className="border-b border-r border-mck-line bg-white px-3 py-2.5">
            <div className="kpi-detail-label font-semibold uppercase tracking-wider text-mck-gray">{s.name}</div>
            <div className="kpi-num kpi-detail-value mt-1 font-semibold text-mck-navy">{fmt(s.value)}</div>
            <div className="kpi-detail-pct text-mck-gray">{s.pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div className="kpi-detail-pct mt-3 text-center text-mck-gray">
        Total <span className="kpi-num font-semibold text-mck-navy">{fmt(total)}</span>
      </div>
    </div>
  )
}

export function ReceivingSheet() {
  const [data, setData] = useState<ReceivingPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metricKey, setMetricKey] = useState<MetricKey>('units')
  const [barMode, setBarMode] = useState<BarMode>('daily')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/receiving.json?t=` + Date.now())
      .then((r) => {
        if (!r.ok) throw new Error('receiving.json not found. Run Update_All_Data.bat')
        return r.json()
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-xl mck-panel p-8 text-center">
        <h1 className="mb-2 font-serif text-xl font-semibold text-mck-navy">Data not loaded</h1>
        <p className="text-sm text-mck-gray">{error}</p>
      </div>
    )
  }

  if (!data) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-mck-gray">Loading receiving…</div>
  }

  const unitLabel = metricKey === 'units' ? 'Units' : 'Cartons'
  const meta = data.meta
  const periodWord = barMode === 'daily' ? 'Daily' : 'Weekly'
  const normalSeries = barMode === 'daily' ? data.normal.dailySeries : data.normal.weeklySeries
  const drsSeries = barMode === 'daily' ? data.drs.dailySeries : data.drs.weeklySeries

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">
      <header className="mb-8 flex flex-col gap-5 border-b border-mck-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="mck-rule" />
            <span className="text-[11px] font-semibold uppercase tracking-section text-mck-teal">Executive Dashboard</span>
          </div>
          <h1 className="font-serif text-[30px] font-semibold leading-tight text-mck-navy md:text-[40px]">
            1088 Receiving Status Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mck-gray md:text-[15px]">
            Normal (Z001) and DRS (Z010) goods receipt by division, season mix, and mode of transport for Warehouse 1088.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Slicer
            label="Metric"
            options={[
              { id: 'units', label: 'by Unit' },
              { id: 'cartons', label: 'by Carton' },
            ]}
            value={metricKey}
            onChange={(id) => setMetricKey(id as MetricKey)}
          />
          <div className="mck-panel px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-section text-mck-gray">Data as of</div>
            <div className="kpi-num mt-0.5 text-sm font-semibold text-mck-navy">{meta.asOfLabel}</div>
            <div className="mt-1 text-xs text-mck-gray">Week {meta.weekLabel}</div>
          </div>
        </div>
      </header>

      <div className="mb-6 text-xs text-mck-gray">
        Source {meta.sourceFile} · Warehouse 1088 · {fmt(meta.recordCount)} records · Generated{' '}
        {new Date(meta.updatedAt).toLocaleString()}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-6 text-xs text-mck-gray">
        <span className="text-[11px] font-semibold uppercase tracking-section text-mck-navy">Division</span>
        {(['AP', 'FW', 'EQ'] as const).map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: DIV_COLORS[d] }} />
            {meta.divisionLabels[d]}
          </span>
        ))}
        <span className="text-mck-line">|</span>
        <span>Normal = Z001 · DRS = Z010</span>
      </div>

      <section className="mck-panel mb-8 p-5 md:p-6">
        <SectionHead
          number="01"
          title={`Normal receiving — ${periodWord.toLowerCase()} by division`}
          subtitle={`Shipment Type Z001 · Stacked AP / FW / EQ · ${unitLabel}`}
          right={
            <Slicer
              label="Period"
              options={[
                { id: 'daily', label: 'Daily trend' },
                { id: 'weekly', label: 'Weekly trend' },
              ]}
              value={barMode}
              onChange={(id) => setBarMode(id as BarMode)}
            />
          }
        />
        <StackedBars series={normalSeries} metricKey={metricKey} />
        <QuantityTable series={normalSeries} metricKey={metricKey} mode={barMode} unitLabel={unitLabel} variant="normal" />
      </section>

      <section className="mck-panel mb-8 p-5 md:p-6">
        <SectionHead
          number="02"
          title={`DRS receiving — ${periodWord.toLowerCase()} by division`}
          subtitle={`Shipment Type Z010 · Stacked AP / FW / EQ · ${unitLabel}`}
        />
        <StackedBars series={drsSeries} metricKey={metricKey} />
        <QuantityTable series={drsSeries} metricKey={metricKey} mode={barMode} unitLabel={unitLabel} variant="drs" />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-3">
        <section className="mck-panel h-full p-5 md:p-6">
          <MixPie number="03" dataMap={data.normal.season} metricKey={metricKey} title="Normal — Season mix" subtitle="Z001 · SEASON" />
        </section>
        <section className="mck-panel h-full p-5 md:p-6">
          <MixPie number="04" dataMap={data.drs.season} metricKey={metricKey} title="DRS — Season mix" subtitle="Z010 · SEASON" />
        </section>
        <section className="mck-panel h-full p-5 md:p-6">
          <MixPie number="05" dataMap={data.mot} metricKey={metricKey} title="Mode of transport" subtitle="Mode of Transport Code (PO Ln)" />
        </section>
      </div>

      <footer className="mt-10 border-t border-mck-line pt-4 text-[11px] leading-relaxed text-mck-gray">
        Unit = Total Shipped Quantity (Sh Ln) · Carton = Total Cartons (Sh Ln) | Division: 10 AP · 20 FW · 30 EQ
      </footer>
    </div>
  )
}
