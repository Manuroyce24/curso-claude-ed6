import { describe, it, expect } from 'vitest'
import { validatePlainPassword } from './Password.js'
import { WeakPasswordError } from '@errors/DomainErrors.js'

describe('validatePlainPassword', () => {
    it('acepta una contraseña de 10 o más caracteres', () => {
        expect(validatePlainPassword('abcdefghij')).toBe('abcdefghij')
    })

    it.each([undefined, null, 123, {}, ['abcdefghij']])('rechaza un valor que no es string (%s)', (valor) => {
        expect(() => validatePlainPassword(valor)).toThrow(WeakPasswordError)
    })

    it('rechaza menos de 10 caracteres', () => {
        expect(() => validatePlainPassword('corta123')).toThrow(WeakPasswordError)
    })

    it('rechaza más de 72 caracteres (límite de bcrypt)', () => {
        expect(() => validatePlainPassword('a'.repeat(73))).toThrow(WeakPasswordError)
    })
})
