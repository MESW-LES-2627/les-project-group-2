import { it, expect } from 'vitest'

it('passa sempre', () => {
  expect(true).toBe(true)
})

it('isto não devia passar', () => {
  expect(true).toBe(false)
})
