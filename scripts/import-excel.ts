import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const DATA_DIR = 'C:\\Users\\nkim60\\OneDrive - Nike\\바탕 화면\\WCS_Carton'

function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** Prefer today's YYYYMMDD file; otherwise newest .xlsx in DATA_DIR. */
function resolveDefaultExcelPath(): string {
  if (!existsSync(DATA_DIR)) {
    throw new Error(`데이터 폴더를 찾을 수 없습니다: ${DATA_DIR}`)
  }

  const files = readdirSync(DATA_DIR)
    .filter((name) => name.toLowerCase().endsWith('.xlsx'))
    .map((name) => {
      const fullPath = join(DATA_DIR, name)
      return { name, fullPath, mtime: statSync(fullPath).mtimeMs }
    })

  if (files.length === 0) {
    throw new Error(`폴더에 .xlsx 파일이 없습니다: ${DATA_DIR}`)
  }

  const stamp = todayStamp()
  const todayMatch = files
    .filter((f) => f.name.includes(stamp))
    .sort((a, b) => b.mtime - a.mtime)

  if (todayMatch.length > 0) return todayMatch[0].fullPath

  files.sort((a, b) => b.mtime - a.mtime)
  return files[0].fullPath
}

const EXCEL_PATH = process.argv[2] ?? resolveDefaultExcelPath()
const OUT_PATH = resolve(root, 'public/data/channels.json')

const TALL_LEVELS = new Set(['06', '11', '16', '22', '24', '26', '31', '36', '41'])

type ChannelStatus = 'full' | 'half' | 'empty'
type LocationType = 'tall' | 'normal'
type Highbay = 'HB.A' | 'HB.B' | 'OTHER'

interface Channel {
  warehouse: string
  highbay: Highbay
  channelId: string
  aisle: string
  level: string
  bay: string
  side: string
  totalPallets: number
  cartonS: number
  cartonM: number
  cartonL: number
  loaded: number
  unloaded: number
  status: ChannelStatus
  locationType: LocationType
}

interface Bucket {
  channels: number
  full: number
  half: number
  empty: number
  cartonS: number
  cartonM: number
  cartonL: number
  loadedSlots: number
  largeChannels: number
  largeFull: number
  largeHalf: number
}

function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function padLevel(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (/^\d+$/.test(raw)) return raw.padStart(2, '0')
  return raw
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  // Fuzzy match: normalize spaces
  const entries = Object.entries(row)
  for (const key of keys) {
    const found = entries.find(([k]) => k.replace(/\s/g, '') === key.replace(/\s/g, ''))
    if (found) return found[1]
  }
  return undefined
}

function cellAt(row: unknown[], index: number): unknown {
  if (index < 0 || index >= row.length) return undefined
  return row[index]
}

function findCol(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const target = name.replace(/\s/g, '')
    const idx = headers.findIndex((h) => h.replace(/\s/g, '') === target)
    if (idx >= 0) return idx
  }
  return -1
}

function isSubHeaderRow(row: unknown[]): boolean {
  const cells = row.map((c) => String(c ?? '').replace(/\s/g, ''))
  return cells.includes('S(3/12)') && (cells.includes('적재') || cells.includes('전체'))
}

/** Support single-header sheets and 2-row headers (박스/슬롯 group + S/M/L/적재). */
function readSheetRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })
  if (matrix.length === 0) return []

  let headerRow = 0
  let dataStart = 1
  if (matrix.length >= 2 && isSubHeaderRow(matrix[1])) {
    headerRow = 1
    dataStart = 2
  }

  const top = matrix[0] ?? []
  const sub = matrix[headerRow] ?? []
  const width = Math.max(top.length, sub.length)
  const headers: string[] = []
  for (let i = 0; i < width; i++) {
    const fromSub = String(sub[i] ?? '').trim()
    const fromTop = String(top[i] ?? '').trim()
    headers.push(fromSub || fromTop || `COL_${i}`)
  }

  // Prefer first occurrence for duplicate names (박스 S/M/L before Deadspace S/M/L)
  const col = {
    warehouse: findCol(headers, '창고구분'),
    channel: findCol(headers, '채널'),
    aisle: findCol(headers, '통로(AISLE)', '통로'),
    level: findCol(headers, '단(LEVEL)', '단'),
    bay: findCol(headers, '행(BAY)', '행'),
    side: findCol(headers, '방향(SIDE)', '방향'),
    total: findCol(headers, '전체'),
    s: findCol(headers, 'S(3/12)', 'S'),
    m: findCol(headers, 'M(4/12)', 'M'),
    l: findCol(headers, 'L(6/12)', 'L'),
    loaded: findCol(headers, '적재'),
    unloaded: findCol(headers, '미적재'),
  }

  const rows: Record<string, unknown>[] = []
  for (let r = dataStart; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    rows.push({
      창고구분: cellAt(row, col.warehouse),
      채널: cellAt(row, col.channel),
      '통로(AISLE)': cellAt(row, col.aisle),
      '단(LEVEL)': cellAt(row, col.level),
      '행(BAY)': cellAt(row, col.bay),
      '방향(SIDE)': cellAt(row, col.side),
      전체: cellAt(row, col.total),
      'S(3/12)': cellAt(row, col.s),
      'M(4/12)': cellAt(row, col.m),
      'L(6/12)': cellAt(row, col.l),
      적재: cellAt(row, col.loaded),
      미적재: cellAt(row, col.unloaded),
    })
  }
  return rows
}

function classifyHighbay(warehouse: string): Highbay {
  if (/HB\.?\s*A/i.test(warehouse)) return 'HB.A'
  if (/HB\.?\s*B/i.test(warehouse)) return 'HB.B'
  return 'OTHER'
}

function statusOf(loaded: number): ChannelStatus {
  if (loaded >= 12) return 'full'
  if (loaded <= 0) return 'empty'
  return 'half'
}

function locationOf(level: string): LocationType {
  return TALL_LEVELS.has(level) ? 'tall' : 'normal'
}

function emptyBucket(): Bucket {
  return {
    channels: 0,
    full: 0,
    half: 0,
    empty: 0,
    cartonS: 0,
    cartonM: 0,
    cartonL: 0,
    loadedSlots: 0,
    largeChannels: 0,
    largeFull: 0,
    largeHalf: 0,
  }
}

function addToBucket(bucket: Bucket, channel: Channel) {
  bucket.channels += 1
  bucket[channel.status] += 1
  bucket.cartonS += channel.cartonS
  bucket.cartonM += channel.cartonM
  bucket.cartonL += channel.cartonL
  bucket.loadedSlots += channel.loaded

  // Large channel: currently holding at least one L carton
  if (channel.cartonL > 0) {
    bucket.largeChannels += 1
    if (channel.status === 'full') bucket.largeFull += 1
    if (channel.status === 'half') bucket.largeHalf += 1
  }
}

function main() {
  console.log(`Reading: ${EXCEL_PATH}`)
  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = readSheetRows(sheet)

  console.log(`Rows: ${rows.length}`)
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]))
    console.log('Sample:', JSON.stringify(rows[0], null, 2))
  }

  const warehouseCounts = new Map<string, number>()
  const channels: Channel[] = []

  for (const row of rows) {
    const warehouse = String(pick(row, ['창고구분']) ?? '').trim()
    if (!warehouse) continue

    warehouseCounts.set(warehouse, (warehouseCounts.get(warehouse) ?? 0) + 1)

    const level = padLevel(pick(row, ['단(LEVEL)', '단']))
    const loaded = num(pick(row, ['적재']))
    const highbay = classifyHighbay(warehouse)
    const channel: Channel = {
      warehouse,
      highbay,
      channelId: String(pick(row, ['채널']) ?? '').trim(),
      aisle: String(pick(row, ['통로(AISLE)', '통로']) ?? '').trim(),
      level,
      bay: String(pick(row, ['행(BAY)', '행']) ?? '').trim(),
      side: String(pick(row, ['방향(SIDE)', '방향']) ?? '').trim(),
      totalPallets: num(pick(row, ['전체'])),
      cartonS: num(pick(row, ['S(3/12)', 'S'])),
      cartonM: num(pick(row, ['M(4/12)', 'M'])),
      cartonL: num(pick(row, ['L(6/12)', 'L'])),
      loaded,
      unloaded: num(pick(row, ['미적재'])),
      status: statusOf(loaded),
      locationType: locationOf(level),
    }
    channels.push(channel)
  }

  console.log('--- Warehouses ---')
  for (const [name, count] of [...warehouseCounts.entries()].sort()) {
    console.log(`${name}: ${count} (mapped=${classifyHighbay(name)})`)
  }

  const hbChannels = channels.filter((c) => c.highbay === 'HB.A' || c.highbay === 'HB.B')
  console.log(`HB.A/B channels: ${hbChannels.length} / ${channels.length}`)

  const overall = emptyBucket()
  const byHighbay: Record<'HB.A' | 'HB.B', Bucket> = {
    'HB.A': emptyBucket(),
    'HB.B': emptyBucket(),
  }
  const byLocation: Record<LocationType, Bucket> = {
    tall: emptyBucket(),
    normal: emptyBucket(),
  }
  const matrix: Record<'HB.A' | 'HB.B', Record<LocationType, Bucket>> = {
    'HB.A': { tall: emptyBucket(), normal: emptyBucket() },
    'HB.B': { tall: emptyBucket(), normal: emptyBucket() },
  }

  type CartonSizeKey = 'S' | 'M' | 'L'
  function emptyCartonSlice() {
    return {
      byHighbay: {
        'HB.A': emptyBucket(),
        'HB.B': emptyBucket(),
      } as Record<'HB.A' | 'HB.B', Bucket>,
      matrix: {
        'HB.A': { tall: emptyBucket(), normal: emptyBucket() },
        'HB.B': { tall: emptyBucket(), normal: emptyBucket() },
      } as Record<'HB.A' | 'HB.B', Record<LocationType, Bucket>>,
    }
  }
  const byCartonSize: Record<CartonSizeKey, ReturnType<typeof emptyCartonSlice>> = {
    S: emptyCartonSlice(),
    M: emptyCartonSlice(),
    L: emptyCartonSlice(),
  }

  function cartonSizesOf(channel: Channel): CartonSizeKey[] {
    const sizes: CartonSizeKey[] = []
    if (channel.cartonS > 0) sizes.push('S')
    if (channel.cartonM > 0) sizes.push('M')
    if (channel.cartonL > 0) sizes.push('L')
    return sizes
  }

  for (const channel of hbChannels) {
    addToBucket(overall, channel)
    if (channel.highbay === 'HB.A' || channel.highbay === 'HB.B') {
      addToBucket(byHighbay[channel.highbay], channel)
      addToBucket(byLocation[channel.locationType], channel)
      addToBucket(matrix[channel.highbay][channel.locationType], channel)

      for (const size of cartonSizesOf(channel)) {
        const slice = byCartonSize[size]
        addToBucket(slice.byHighbay[channel.highbay], channel)
        addToBucket(slice.matrix[channel.highbay][channel.locationType], channel)
      }
    }
  }

  // Executive dashboard primarily needs aggregates. Keep summary + warehouse meta only
  // to avoid shipping a 100MB+ JSON of every channel to the browser.
  const dataset = {
    generatedAt: new Date().toISOString(),
    sourceFile: EXCEL_PATH.split(/[/\\]/).pop(),
    totalChannels: hbChannels.length,
    tallLevels: [...TALL_LEVELS],
    definitions: {
      full: 'Loaded slots = 12',
      half: '0 < Loaded slots < 12',
      empty: 'Loaded slots = 0',
      tallLevels: [...TALL_LEVELS],
      normal: 'All levels except Tall',
    },
    summary: {
      overall,
      byHighbay,
      byLocation,
      matrix,
      byCartonSize,
    },
    warehouses: [...warehouseCounts.entries()]
      .map(([name, channelCount]) => ({
        name,
        highbay: classifyHighbay(name),
        channelCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2))
  console.log(`Wrote ${OUT_PATH}`)
  console.log('Summary overall:', overall)
  console.log('HB.A:', byHighbay['HB.A'])
  console.log('HB.B:', byHighbay['HB.B'])
}

main()
