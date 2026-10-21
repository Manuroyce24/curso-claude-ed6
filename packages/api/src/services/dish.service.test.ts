import { describe, it, expect, beforeEach } from 'vitest'
import { DishService } from './dish.service.js'
import { MockDishRepository } from '@repositories/mocks/MockDishRepository.js'
import { DishNotFoundError, InvalidPriceError } from '@errors/DomainErrors.js'

const datos = { name: 'Paella', description: null, price: 12, category: 'principal', available: true, ingredients: [] }

describe('DishService (aislamiento por restaurante)', () => {
    let repo: MockDishRepository
    let service: DishService
    let idPlatoB: string

    beforeEach(async () => {
        repo = new MockDishRepository()
        service = new DishService(repo)
        idPlatoB = (await service.create({ ...datos, restaurantId: 'rest-b' })).id
    })

    it('findById devuelve null para un plato de otro restaurante', async () => {
        expect(await service.findById('rest-a', idPlatoB)).toBeNull()
        expect((await service.findById('rest-b', idPlatoB))?.id).toBe(idPlatoB)
    })

    it('update no modifica un plato de otro restaurante', async () => {
        await expect(service.update('rest-a', idPlatoB, { ...datos, name: 'Hackeado' }))
            .rejects.toThrow(DishNotFoundError)
        expect((await repo.findById(idPlatoB))?.name).toBe('Paella')
    })

    it('delete no borra un plato de otro restaurante', async () => {
        await expect(service.delete('rest-a', idPlatoB)).rejects.toThrow(DishNotFoundError)
        expect(await repo.findById(idPlatoB)).not.toBeNull()
    })

    it('update y delete funcionan en el restaurante propietario', async () => {
        await service.update('rest-b', idPlatoB, { ...datos, name: 'Nueva' })
        expect((await repo.findById(idPlatoB))?.name).toBe('Nueva')
        await service.delete('rest-b', idPlatoB)
        expect(await repo.findById(idPlatoB)).toBeNull()
    })

    it.each([NaN, Infinity, -Infinity, -1, 0, '12' as unknown as number, null as unknown as number])('rechaza el precio %s', async (price) => {
        await expect(service.create({ ...datos, price, restaurantId: 'rest-a' })).rejects.toThrow(InvalidPriceError)
    })

    it('acepta un precio positivo y finito', async () => {
        const dish = await service.create({ ...datos, price: 9.5, restaurantId: 'rest-a' })
        expect(dish.price).toBe(9.5)
    })
})
