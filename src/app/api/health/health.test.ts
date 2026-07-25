import { describe, it, expect, vi } from 'vitest'

describe('GET /api/health', () => {
  it('returns 200 and status ok when the database is reachable', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: () => ({
          select: () => ({
            limit: async () => ({ error: null }),
          }),
        }),
      }),
    }))

    const { GET } = await import('./route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })

    vi.doUnmock('@/lib/supabase/server')
    vi.resetModules()
  })

  it('returns 500 when the database is unreachable', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        from: () => ({
          select: () => ({
            limit: async () => ({ error: { message: 'connection refused' } }),
          }),
        }),
      }),
    }))

    const { GET } = await import('./route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ status: 'error', message: 'connection refused' })

    vi.doUnmock('@/lib/supabase/server')
    vi.resetModules()
  })
})
