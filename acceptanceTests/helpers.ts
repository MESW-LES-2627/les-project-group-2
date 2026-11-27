import { BrowserContext, Page } from '@playwright/test'
import type { PlanitTestSession } from '@/utils/supabase/test-session'

const PORT = process.env.PORT || 3000
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

type TestPin = NonNullable<PlanitTestSession['pins']>[number]
type TestPinVote = NonNullable<PlanitTestSession['pinVotes']>[number]

export function makePin(overrides: Partial<TestPin> = {}): TestPin {
  return {
    id: 'pin-1',
    trip_id: 'trip-301',
    name: 'Torre de Belém',
    description: 'Historical monument',
    category: 'visit',
    lat: 38.6916,
    lng: -9.216,
    proposed_by: 'traveler@planit.app',
    created_at: '2026-11-01T00:00:00Z',
    is_confirmed: false,
    ...overrides,
  }
}

export function makeVote(overrides: Partial<TestPinVote> = {}): TestPinVote {
  return {
    id: 'vote-1',
    pin_id: 'pin-1',
    user_id: 'voter-1',
    user_email: 'voter@planit.app',
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}


export async function createPinWithCategory(page: Page, category: string) {
  const modal = page.getByTestId('new-pin-modal')
  await modal.getByText(category, { exact: true }).click()
  await page.getByTestId('create-pin-button').click()
}
