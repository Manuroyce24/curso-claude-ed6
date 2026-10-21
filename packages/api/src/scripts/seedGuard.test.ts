import { describe, it, expect } from 'vitest'
import { assertSeedAllowed } from './seedGuard.js'

describe('assertSeedAllowed', () => {
    it('bloquea el seed en producción', () => {
        expect(() => assertSeedAllowed({ NODE_ENV: 'production' })).toThrow(/producción/)
    })

    it.each(['development', 'test', undefined])('permite el seed con NODE_ENV=%s', (entorno) => {
        expect(() => assertSeedAllowed({ NODE_ENV: entorno })).not.toThrow()
    })
})
