import { useEffect, useState } from 'react'
import type { HealthDataset } from '../types/health'

export function useHealthData() {
  const [data, setData] = useState<HealthDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const response = await fetch(`${import.meta.env.BASE_URL}data/channels.json`)
        if (!response.ok) {
          throw new Error('Healthiness 데이터를 불러오지 못했습니다.')
        }
        const json = (await response.json()) as HealthDataset
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '알 수 없는 오류')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
