import { describe, it, expect } from 'vitest'
import { Email } from './Email.js'
import { InvalidEmailError } from '@errors/DomainErrors.js'

describe('Email', () => {
    it('normaliza a minúsculas y recorta espacios', () => {
        expect(new Email('  Ana@Resttek.COM ').getValue()).toBe('ana@resttek.com')
    })

    it('expone la normalización para búsquedas', () => {
        expect(Email.normalize(' A@B.com ')).toBe('a@b.com')
    })

    it('rechaza formatos inválidos', () => {
        expect(() => new Email('no-es-email')).toThrow(InvalidEmailError)
    })
})
