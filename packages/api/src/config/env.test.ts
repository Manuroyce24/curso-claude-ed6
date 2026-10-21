import { describe, it, expect } from 'vitest'
import { leerJwtSecret } from './env.js'

describe('leerJwtSecret', () => {
    it('falla si JWT_SECRET no está definido', () => {
        expect(() => leerJwtSecret({})).toThrow(/JWT_SECRET/)
    })

    it('falla si está vacío', () => {
        expect(() => leerJwtSecret({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/)
    })

    it('falla si tiene menos de 32 caracteres', () => {
        expect(() => leerJwtSecret({ JWT_SECRET: 'corto' })).toThrow(/32/)
    })

    it('rechaza el secreto por defecto antiguo', () => {
        expect(() => leerJwtSecret({ JWT_SECRET: 'super-secret-resttek-key'.padEnd(40, 'x') })).not.toThrow()
        expect(() => leerJwtSecret({ JWT_SECRET: 'super-secret-resttek-key' })).toThrow()
    })

    it('devuelve el secreto válido', () => {
        const secreto = 'a'.repeat(32)
        expect(leerJwtSecret({ JWT_SECRET: secreto })).toBe(secreto)
    })
})
