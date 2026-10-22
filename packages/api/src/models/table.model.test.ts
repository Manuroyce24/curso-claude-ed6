import { describe, it, expect } from 'vitest'
import { normalizeTableStatus, VALID_TABLE_STATUSES } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('acepta los estados libre, ocupada y reservada', () => {
        expect(VALID_TABLE_STATUSES).toEqual(['libre', 'ocupada', 'reservada'])
        for (const estado of VALID_TABLE_STATUSES) {
            expect(normalizeTableStatus(estado)).toBe(estado)
        }
    })

    it('normaliza mayúsculas y espacios', () => {
        expect(normalizeTableStatus('  Ocupada ')).toBe('ocupada')
    })

    it('rechaza un estado desconocido', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
    })

    it('rechaza valores que no son texto', () => {
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
