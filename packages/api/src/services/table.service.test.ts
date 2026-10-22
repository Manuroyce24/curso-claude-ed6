import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidTableDescriptionError,
    InvalidTableStatusError,
    DuplicatedTableNumberError
} from '@errors/DomainErrors.js'

const datos = { number: 1, description: 'Ventana', capacity: 4 }

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('crea una mesa libre por defecto con id y fechas', async () => {
            const mesa = await service.create('rest-a', datos)
            expect(mesa).toMatchObject({ number: 1, description: 'Ventana', capacity: 4, status: 'libre', restaurantId: 'rest-a' })
            expect(mesa.id).toBeTruthy()
            expect(mesa.createdAt).toBe(mesa.updatedAt)
            expect(await repo.findByIdInRestaurant(mesa.id, 'rest-a')).toEqual(mesa)
        })

        it('respeta el estado indicado y normaliza la descripción vacía a null', async () => {
            const mesa = await service.create('rest-a', { ...datos, description: '  ', status: 'Reservada' })
            expect(mesa.status).toBe('reservada')
            expect(mesa.description).toBeNull()
        })

        it.each([0, -1, 1.5, '3', undefined])('rechaza el número %s', async (number) => {
            await expect(service.create('rest-a', { ...datos, number: number as number }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([0, 51, 2.5, '4', undefined])('rechaza la capacidad %s', async (capacity) => {
            await expect(service.create('rest-a', { ...datos, capacity: capacity as number }))
                .rejects.toThrow(InvalidCapacityError)
        })

        it('rechaza una descripción de más de 200 caracteres o que no sea texto', async () => {
            await expect(service.create('rest-a', { ...datos, description: 'x'.repeat(201) }))
                .rejects.toThrow(InvalidTableDescriptionError)
            await expect(service.create('rest-a', { ...datos, description: 42 as unknown as string }))
                .rejects.toThrow(InvalidTableDescriptionError)
        })

        it('rechaza un estado inválido', async () => {
            await expect(service.create('rest-a', { ...datos, status: 'rota' }))
                .rejects.toThrow(InvalidTableStatusError)
        })

        it('rechaza un número repetido en el mismo restaurante pero lo permite en otro', async () => {
            await service.create('rest-a', datos)
            await expect(service.create('rest-a', datos)).rejects.toThrow(DuplicatedTableNumberError)
            await expect(service.create('rest-b', datos)).resolves.toMatchObject({ restaurantId: 'rest-b' })
        })
    })

    describe('findByRestaurantId', () => {
        it('devuelve solo las mesas del restaurante', async () => {
            await service.create('rest-a', { ...datos, number: 2 })
            await service.create('rest-a', datos)
            await service.create('rest-b', datos)
            const mesas = await service.findByRestaurantId('rest-a')
            expect(mesas.map(m => m.number)).toEqual([1, 2])
        })
    })
})
