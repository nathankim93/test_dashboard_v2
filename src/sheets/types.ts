export type SheetId = 'inventory' | 'receiving' | 'healthiness'

export const SHEETS: { id: SheetId; label: string }[] = [
  { id: 'inventory', label: 'Inventory Status' },
  { id: 'receiving', label: 'Receiving Status' },
  { id: 'healthiness', label: 'Highbay Healthiness' },
]

export function sheetFromHash(): SheetId {
  const h = (window.location.hash || '').replace(/^#/, '').toLowerCase()
  if (h === 'receiving' || h === 'healthiness' || h === 'inventory') return h
  return 'inventory'
}
