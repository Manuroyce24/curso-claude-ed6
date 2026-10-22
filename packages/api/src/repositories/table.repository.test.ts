import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteTableRepository } from './table.repository.js'

const ahora = '2026-10-22T10:00:00.000Z'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const crearRestaurante = (id: string) => db.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, `Restaurante ${id}`, 'Calle 1', `${id}@resttek.com`, '+34600000000', 'Ana', 'Dueña', ahora, ahora]
    )

    const insertarMesa = (id: string, restaurantId: string, number: number, capacity: number, status = 'libre') => db.run(
        'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, restaurantId, number, `Mesa ${number}`, capacity, status, ahora, ahora]
    )

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        await crearRestaurante('rest-a')
        await crearRestaurante('rest-b')
        await insertarMesa('mesa-a3', 'rest-a', 3, 6)
        await insertarMesa('mesa-a1', 'rest-a', 1, 2)
        await insertarMesa('mesa-a2', 'rest-a', 2, 4, 'ocupada')
        await insertarMesa('mesa-b1', 'rest-b', 1, 4)
    })

    afterAll(async () => {
        await db.close()
    })

    describe('lectura', () => {
        it('lista las mesas de un restaurante ordenadas por número', async () => {
            const mesas = await repo.findByRestaurantId('rest-a')
            expect(mesas.map(m => m.number)).toEqual([1, 2, 3])
        })

        it('mapea las columnas al modelo Table', async () => {
            const mesa = await repo.findByIdInRestaurant('mesa-a2', 'rest-a')
            expect(mesa).toEqual({
                id: 'mesa-a2',
                number: 2,
                description: 'Mesa 2',
                capacity: 4,
                status: 'ocupada',
                restaurantId: 'rest-a',
                createdAt: ahora,
                updatedAt: ahora
            })
        })

        it('no encuentra una mesa de otro restaurante', async () => {
            expect(await repo.findByIdInRestaurant('mesa-b1', 'rest-a')).toBeNull()
        })

        it('busca una mesa por número dentro del restaurante', async () => {
            expect((await repo.findByNumber('rest-b', 1))?.id).toBe('mesa-b1')
            expect(await repo.findByNumber('rest-b', 2)).toBeNull()
        })
    })

    describe('escritura', () => {
        const nueva = {
            id: 'mesa-b9',
            number: 9,
            description: null,
            capacity: 8,
            status: 'libre' as const,
            restaurantId: 'rest-b',
            createdAt: ahora,
            updatedAt: ahora
        }

        it('inserta una mesa nueva', async () => {
            await repo.save(nueva)
            expect(await repo.findByIdInRestaurant('mesa-b9', 'rest-b')).toEqual(nueva)
        })

        it('actualiza una mesa existente', async () => {
            const editada = { ...nueva, number: 10, description: 'Terraza', capacity: 6, status: 'reservada' as const, updatedAt: '2026-10-23T10:00:00.000Z' }
            await repo.save(editada)
            expect(await repo.findByIdInRestaurant('mesa-b9', 'rest-b')).toEqual(editada)
        })

        it('cambia solo el estado y la fecha de actualización', async () => {
            await repo.updateStatus('mesa-b9', 'ocupada', '2026-10-24T10:00:00.000Z')
            const mesa = await repo.findByIdInRestaurant('mesa-b9', 'rest-b')
            expect(mesa?.status).toBe('ocupada')
            expect(mesa?.updatedAt).toBe('2026-10-24T10:00:00.000Z')
            expect(mesa?.number).toBe(10)
        })

        it('borra una mesa', async () => {
            await repo.delete('mesa-b9')
            expect(await repo.findByIdInRestaurant('mesa-b9', 'rest-b')).toBeNull()
        })
    })
})
