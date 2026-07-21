/**
 * Run all three data importers into public/data.
 * Does not modify the original standalone dashboard projects.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(label, command, args) {
  console.log('\n======== ' + label + ' ========')
  const r = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error('[FAIL]', label)
    process.exit(r.status || 1)
  }
  console.log('[OK]', label)
}

run('Inventory (Query Excel → inventory.json)', 'node', ['scripts/build-inventory.cjs'])
run('Receiving (Amberroad Excel → receiving.json)', 'node', ['scripts/build-receiving.cjs'])
run('Healthiness (WCS Excel → channels.json)', 'npx', ['tsx', 'scripts/import-excel.ts'])

console.log('\nAll datasets updated under public/data/')
console.log('Refresh http://127.0.0.1:5200/ if the Hub is already open.')
