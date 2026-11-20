import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildTestSupabaseClient, type PlanitTestSession } from './test-session'

export async function createClient() {
  const cookieStore = await cookies()

  const allCookies = typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : []
  const testSessionCookie = allCookies.find((c) => c.name === 'planit-test-session')
  if (testSessionCookie?.value) {
    try {
      const parsed: PlanitTestSession = JSON.parse(decodeURIComponent(testSessionCookie.value))
      return buildTestSupabaseClient(parsed, cookieStore)
    } catch {
      // Fall through to standard client if parsing fails
    }
  }

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado a partir de um Server Component: pode ser ignorado.
          }
        },
      },
    }
  )
}   
