import type { H3Event } from 'h3'
import type { Compilable } from 'kysely'
import { createError } from 'h3'

interface AnalyticsResponse {
  meta?: Array<{ name: string, type: string }>
  data?: Array<Record<string, unknown>>
  [key: string]: unknown
}

function normalizeAnalyticsNumbers(response: AnalyticsResponse): AnalyticsResponse {
  const numericColumns = response.meta
    ?.filter(column => /^(?:Nullable\()?(?:U?Int\d+|Float\d+|Decimal(?:\(|$))/.test(column.type))
    .map(column => column.name) ?? []

  if (!numericColumns.length || !response.data)
    return response

  return {
    ...response,
    data: response.data.map((row) => {
      const normalized = { ...row }
      for (const column of numericColumns) {
        const value = row[column]
        if (value === null) {
          normalized[column] = 0
        }
        else if (typeof value === 'string' && value !== '') {
          const number = Number(value)
          if (Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER)
            normalized[column] = number
        }
      }
      return normalized
    }),
  }
}

export async function useWAE(event: H3Event, query: Compilable) {
  const { cfAccountId, cfApiToken } = useRuntimeConfig(event)
  if (!cfAccountId || !cfApiToken)
    throw createError({ statusCode: 503, statusMessage: 'Analytics credentials are not configured' })

  const compiledQuery = compileAnalyticsQuery(query)

  if (import.meta.dev)
    console.info('useWAE', compiledQuery)

  const response = await $fetch<AnalyticsResponse>(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfApiToken}`,
    },
    body: compiledQuery,
    retry: 1,
    retryDelay: 100, // ms
  })
  return normalizeAnalyticsNumbers(response)
}
