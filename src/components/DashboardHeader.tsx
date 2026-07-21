import { useState } from 'react'
import type { HealthDataset } from '../types/health'
import { formatNumber } from '../lib/metrics'
import { downloadDashboardPdf } from '../lib/exportPdf'

interface DashboardHeaderProps {
  data: HealthDataset
  /** When true, hide the navy top bar (provided by Ops Hub chrome). */
  embedded?: boolean
}

export function DashboardHeader({ data, embedded = false }: DashboardHeaderProps) {
  const [exporting, setExporting] = useState(false)
  const generated = new Date(data.generatedAt)
  const dateLabel = generated.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function handleDownloadPdf() {
    if (exporting) return
    const target = document.getElementById('dashboard-export-health') || document.getElementById('dashboard-export')
    if (!target) {
      window.alert('대시보드 영역을 찾을 수 없습니다.')
      return
    }

    try {
      setExporting(true)
      await new Promise((resolve) => window.setTimeout(resolve, 50))
      await downloadDashboardPdf(target)
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      window.alert(`PDF 생성에 실패했습니다.\n\n${message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      {!embedded ? (
        <div className="border-b border-mck-navy bg-mck-navy">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 md:px-8">
            <div className="text-[11px] font-semibold tracking-section text-white/70 uppercase">
              Highbay Inventory Analytics
            </div>
            <div className="text-[11px] text-white/60">Confidential</div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-mck-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="mck-rule" />
              <span className="text-[11px] font-semibold tracking-section text-mck-teal uppercase">
                Executive Dashboard
              </span>
            </div>
            <h1 className="font-serif text-[30px] font-semibold leading-tight text-mck-navy md:text-[40px]">
              Highbay Healthiness Status
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mck-gray md:text-[15px]">
              HB.A / HB.B 채널 적재 상태(Full · Half · Empty)와 카톤 규격(S · M · L), Large Carton
              입고 가능 수량을 비교합니다.
            </p>
          </div>

          <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="mck-panel px-4 py-2.5">
              <div className="text-[10px] font-semibold tracking-section text-mck-gray uppercase">
                Data as of
              </div>
              <div className="kpi-num mt-0.5 text-sm font-semibold text-mck-navy">{dateLabel}</div>
            </div>
            <button
              type="button"
              data-html2canvas-ignore="true"
              onClick={() => void handleDownloadPdf()}
              disabled={exporting}
              className="border border-mck-navy bg-white px-4 py-2.5 text-sm font-semibold text-mck-navy hover:bg-mck-mist disabled:opacity-60"
            >
              {exporting ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>
        </header>

        <div className="mb-6 text-xs text-mck-gray">
          Source {data.sourceFile} · {formatNumber(data.totalChannels)} channels · Generated{' '}
          {dateLabel}
        </div>
      </div>
    </>
  )
}
