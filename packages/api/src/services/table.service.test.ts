import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidTableDescriptionError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    TableNotFoundError,
    TableNotAvailableError
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

    describe('findById, update y delete', () => {
        let idMesa: string

        beforeEach(async () => {
            idMesa = (await service.create('rest-a', datos)).id
            await service.create('rest-a', { ...datos, number: 2 })
        })

        it('findById devuelve la mesa de su restaurante y falla para otro', async () => {
            expect((await service.findById('rest-a', idMesa)).number).toBe(1)
            await expect(service.findById('rest-b', idMesa)).rejects.toThrow(TableNotFoundError)
        })

        it('update modifica los datos y conserva id, restaurante y fecha de creación', async () => {
            const original = await service.findById('rest-a', idMesa)
            const editada = await service.update('rest-a', idMesa, { number: 5, description: null, capacity: 6, status: 'reservada' })
            expect(editada).toMatchObject({ id: idMesa, number: 5, description: null, capacity: 6, status: 'reservada', restaurantId: 'rest-a', createdAt: original.createdAt })
            expect(await service.findById('rest-a', idMesa)).toEqual(editada)
        })

        it('update permite mantener el propio número pero no usar el de otra mesa', async () => {
            await expect(service.update('rest-a', idMesa, { ...datos, capacity: 8 })).resolves.toMatchObject({ capacity: 8 })
            await expect(service.update('rest-a', idMesa, { ...datos, number: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('update no modifica una mesa de otro restaurante', async () => {
            await expect(service.update('rest-b', idMesa, { ...datos, capacity: 8 })).rejects.toThrow(TableNotFoundError)
            expect((await service.findById('rest-a', idMesa)).capacity).toBe(4)
        })

        it('update valida los datos', async () => {
            await expect(service.update('rest-a', idMesa, { ...datos, capacity: 0 })).rejects.toThrow(InvalidCapacityError)
        })

        it('delete borra una mesa libre', async () => {
            await service.delete('rest-a', idMesa)
            await expect(service.findById('rest-a', idMesa)).rejects.toThrow(TableNotFoundError)
        })

        it('delete no borra una mesa ocupada ni una de otro restaurante', async () => {
            await service.update('rest-a', idMesa, { ...datos, status: 'ocupada' })
            await expect(service.delete('rest-a', idMesa)).rejects.toThrow(TableNotAvailableError)
            await expect(service.delete('rest-b', idMesa)).rejects.toThrow(TableNotFoundError)
            expect((await service.findById('rest-a', idMesa)).id).toBe(idMesa)
        })
    })

    describe('changeStatus', () => {
        let idMesa: string

        beforeEach(async () => {
            idMesa = (await service.create('rest-a', { ...datos, status: 'ocupada' })).id
        })

        it('libera una mesa ocupada y devuelve la mesa actualizada', async () => {
            const mesa = await service.changeStatus('rest-a', idMesa, 'libre')
            expect(mesa.status).toBe('libre')
            expect((await service.findById('rest-a', idMesa)).status).toBe('libre')
        })

        it('rechaza un estado inválido sin modificar la mesa', async () => {
            await expect(service.changeStatus('rest-a', idMesa, 'rota')).rejects.toThrow(InvalidTableStatusError)
            expect((await service.findById('rest-a', idMesa)).status).toBe('ocupada')
        })

        it('no cambia una mesa de otro restaurante', async () => {
            await expect(service.changeStatus('rest-b', idMesa, 'libre')).rejects.toThrow(TableNotFoundError)
            expect((await service.findById('rest-a', idMesa)).status).toBe('ocupada')
        })
    })
})
