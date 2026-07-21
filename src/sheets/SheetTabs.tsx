import { SHEETS, type SheetId } from './types'

interface SheetTabsProps {
  active: SheetId
  onChange: (id: SheetId) => void
}

export function SheetTabs({ active, onChange }: SheetTabsProps) {
  return (
    <div className="border-b border-mck-line bg-white">
      <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-5 md:px-8">
        {SHEETS.map((s) => {
          const isActive = s.id === active
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={
                'shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ' +
                (isActive
                  ? 'border-mck-teal text-mck-navy'
                  : 'border-transparent text-mck-gray hover:text-mck-navy')
              }
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
