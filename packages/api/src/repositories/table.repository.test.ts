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
})
