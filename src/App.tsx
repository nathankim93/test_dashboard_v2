import { useCallback, useState } from 'react'
import { SheetTabs } from './sheets/SheetTabs'
import { sheetFromHash, type SheetId } from './sheets/types'
import { HealthinessSheet } from './sheets/HealthinessSheet'
import { InventorySheet } from './sheets/InventorySheet'
import { ReceivingSheet } from './sheets/ReceivingSheet'
import { SheetErrorBoundary } from './sheets/SheetErrorBoundary'

export default function App() {
  const [sheet, setSheet] = useState<SheetId>(() => sheetFromHash())

  const onChange = useCallback((id: SheetId) => {
    setSheet(id)
    window.location.hash = id
  }, [])

  return (
    <div className="min-h-screen bg-white text-mck-navy">
      <div className="border-b border-mck-navy bg-mck-navy">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 md:px-8">
          <div className="text-[11px] font-semibold tracking-section text-white/70 uppercase">
            1088 Operations Analytics
          </div>
          <div className="text-[11px] text-white/60">Confidential</div>
        </div>
      </div>

      <SheetTabs active={sheet} onChange={onChange} />

      <div key={sheet}>
        <SheetErrorBoundary label={sheet}>
          {sheet === 'inventory' ? <InventorySheet /> : null}
          {sheet === 'receiving' ? <ReceivingSheet /> : null}
          {sheet === 'healthiness' ? <HealthinessSheet /> : null}
        </SheetErrorBoundary>
      </div>
    </div>
  )
}
