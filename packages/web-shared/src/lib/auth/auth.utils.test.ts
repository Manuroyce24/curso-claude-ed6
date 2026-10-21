import { describe, it, expect } from 'vitest'
import { puedeAcceder, decodeJwtExp, isTokenExpired, parseStoredUser, haySesion } from './auth.utils'

const b64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`

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

describe('decodeJwtExp', () => {
  it('lee exp del payload', () => {
    expect(decodeJwtExp(jwt({ exp: 1_900_000_000 }))).toBe(1_900_000_000)
  })

  it.each(['', 'no-es-jwt', 'a.b', 'a.%%%.c', `a.${b64url({ sin: 'exp' })}.c`, `a.${b64url({ exp: 'x' })}.c`])(
    'devuelve null para un token no válido (%s)', (token) => {
      expect(decodeJwtExp(token)).toBeNull()
    })
})

describe('isTokenExpired', () => {
  const ahora = 1_800_000_000_000

  it('false si faltan más segundos que el margen', () => {
    expect(isTokenExpired(jwt({ exp: ahora / 1000 + 60 }), ahora)).toBe(false)
  })

  it('true si ya caducó', () => {
    expect(isTokenExpired(jwt({ exp: ahora / 1000 - 1 }), ahora)).toBe(true)
  })

  it('true dentro del margen de seguridad', () => {
    expect(isTokenExpired(jwt({ exp: ahora / 1000 + 5 }), ahora, 10)).toBe(true)
  })

  it('true si el token no se puede leer', () => {
    expect(isTokenExpired('basura', ahora)).toBe(true)
  })
})

describe('parseStoredUser', () => {
  it('devuelve el usuario guardado', () => {
    expect(parseStoredUser('{"id":"u1","role":"cocinero"}')).toMatchObject({ id: 'u1', role: 'cocinero' })
  })

  it.each([null, '', '{no es json', 'null', '"texto"', '42', '[]'])('devuelve null para %s sin lanzar', (raw) => {
    expect(parseStoredUser(raw)).toBeNull()
  })
})

describe('haySesion', () => {
  const ahora = 1_800_000_000_000
  const vigente = jwt({ exp: ahora / 1000 + 600 })
  const caducado = jwt({ exp: ahora / 1000 - 600 })

  it('false sin access token', () => {
    expect(haySesion(null, 'refresh', ahora)).toBe(false)
  })

  it('true con access vigente', () => {
    expect(haySesion(vigente, null, ahora)).toBe(true)
  })

  it('true con access caducado pero refresh disponible (se puede renovar)', () => {
    expect(haySesion(caducado, 'refresh', ahora)).toBe(true)
  })

  it('false con access caducado y sin refresh', () => {
    expect(haySesion(caducado, null, ahora)).toBe(false)
  })
})
