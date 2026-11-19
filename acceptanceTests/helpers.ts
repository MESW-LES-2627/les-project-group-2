import { BrowserContext } from '@playwright/test'
import type { PlanitTestSession } from '@/utils/supabase/test-session'

const PORT = process.env.PORT || 3001
export const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${PORT}`

export async function setTestSession(context: BrowserContext, session: PlanitTestSession) {
  await context.addCookies([
    {
      name: 'planit-test-session',
      value: encodeURIComponent(JSON.stringify(session)),
      url: BASE_URL,
    },
  ])
}

export async function clearTestSession(context: BrowserContext) {
  await context.clearCookies()
}
