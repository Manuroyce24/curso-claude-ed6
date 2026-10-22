import { describe, it, expect, beforeEach } from 'vitest'
import { MockTableRepository } from './MockTableRepository.js'
import type { Table, TableStatusType } from '@models/table.model.js'

const mesa = (id: string, restaurantId: string, number: number, capacity: number, status: TableStatusType = 'libre'): Table => ({
    id, number, description: null, capacity, status, restaurantId, createdAt: 't0', updatedAt: 't0'
})

describe('MockTableRepository', () => {
    let repo: MockTableRepository

    beforeEach(async () => {
        repo = new MockTableRepository()
        await repo.save(mesa('m3', 'r1', 3, 6))
        await repo.save(mesa('m1', 'r1', 1, 4))
        await repo.save(mesa('m2', 'r1', 2, 2, 'ocupada'))
        await repo.save(mesa('x1', 'r2', 1, 4))
    })

    it('se comporta como el repositorio real en lecturas', async () => {
        expect((await repo.findByRestaurantId('r1')).map(m => m.id)).toEqual(['m1', 'm2', 'm3'])
        expect(await repo.findByIdInRestaurant('x1', 'r1')).toBeNull()
        expect((await repo.findByNumber('r2', 1))?.id).toBe('x1')
        expect((await repo.findAvailable('r1', 2)).map(m => m.id)).toEqual(['m1', 'm3'])
    })

    it('save sustituye una mesa existente y delete la elimina', async () => {
        await repo.save({ ...mesa('m1', 'r1', 7, 4) })
        expect((await repo.findByIdInRestaurant('m1', 'r1'))?.number).toBe(7)
        await repo.delete('m1')
        expect(await repo.findByIdInRestaurant('m1', 'r1')).toBeNull()
    })

    it('ocupa solo mesas libres del restaurante indicado', async () => {
        expect(await repo.occupyIfFree('m1', 'r1', 't1')).toBe(true)
        expect(await repo.occupyIfFree('m1', 'r1', 't1')).toBe(false)
        expect(await repo.occupyIfFree('x1', 'r1', 't1')).toBe(false)
        expect((await repo.findByIdInRestaurant('m1', 'r1'))?.status).toBe('ocupada')
    })

    it('updateStatus cambia el estado', async () => {
        await repo.updateStatus('m2', 'libre', 't2')
        expect(await repo.findByIdInRestaurant('m2', 'r1')).toMatchObject({ status: 'libre', updatedAt: 't2' })
    })
})
