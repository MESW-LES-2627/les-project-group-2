import { it, expect } from 'vitest'

it('passa sempre', () => {
  expect(true).toBe(true)
})

it('é suposto que este teste falhe', () => {
  expect(true).toBe(false)
})
