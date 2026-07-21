import { DashboardHeader } from '../components/DashboardHeader'
import { HighbayComparisonSection } from '../components/HighbayComparisonSection'
import { KpiStrip } from '../components/KpiStrip'
import { useHealthData } from '../hooks/useHealthData'

export function HealthinessSheet() {
  const { data, loading, error } = useHealthData()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-white text-mck-gray">
        Loading healthiness metrics…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-white px-6 text-center text-red-700">
        {error ?? 'Unable to display data. Refresh public/data/channels.json via Update_All_Data.bat.'}
      </div>
    )
  }

  const { overall, byHighbay, matrix, byCartonSize } = data.summary

  return (
    <div id="dashboard-export-health">
      <DashboardHeader data={data} embedded />

      <div className="mx-auto max-w-[1280px] px-5 pb-10 md:px-8">
        <KpiStrip overall={overall} />

        <HighbayComparisonSection
          byHighbay={byHighbay}
          matrix={matrix}
          byCartonSize={byCartonSize}
        />

        <footer className="mt-10 border-t border-mck-line pt-4 text-[11px] leading-relaxed text-mck-gray">
          Definitions — Full: loaded = 12 · Half: 0 &lt; loaded &lt; 12 · Empty: loaded = 0 · Large
          Channel: L(6/12) &gt; 0
        </footer>
      </div>
    </div>
  )
}
