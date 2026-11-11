import { describe, expect, it } from 'vitest'
import { safeEqual } from './safe-equal'

describe('safeEqual', () => {
  it('iguales', () => expect(safeEqual('abc', 'abc')).toBe(true))
  it('distintos', () => expect(safeEqual('abc', 'abd')).toBe(false))
  it('distinta longitud', () => expect(safeEqual('abc', 'abcd')).toBe(false))
})
