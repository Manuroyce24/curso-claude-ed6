import { describe, it, expect } from 'vitest'
import { puedeAcceder } from './auth.utils'

describe('puedeAcceder', () => {
  it('permite un rol incluido', () => {
    expect(puedeAcceder({ role: 'cocinero' }, ['cocinero', 'manager'])).toBe(true)
  })

  it('deniega un rol no incluido', () => {
    expect(puedeAcceder({ role: 'camarero' }, ['cocinero', 'manager'])).toBe(false)
  })

  it('deniega si no hay usuario o rol', () => {
    expect(puedeAcceder(null, ['cocinero'])).toBe(false)
    expect(puedeAcceder({}, ['cocinero'])).toBe(false)
  })

  it('deniega si la ruta no declara roles (cerrado por defecto)', () => {
    expect(puedeAcceder({ role: 'admin' }, undefined)).toBe(false)
    expect(puedeAcceder({ role: 'admin' }, [])).toBe(false)
  })
})
