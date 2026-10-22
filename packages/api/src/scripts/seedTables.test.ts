import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { seedTables, MESA_PEDIDO_EJEMPLO } from './seedTables.js'

describe('seedTables', () => {
    let db: Database

    const contar = async (restaurantId: string) =>
        (await db.get<{ total: number }>('SELECT COUNT(*) as total FROM restaurant_tables WHERE restaurant_id = ?', [restaurantId]))?.total

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        const ahora = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'C', `${id}@r.com`, '+34600000000', 'A', 'B', ahora, ahora]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('crea 6 mesas en rest-1 y 4 en rest-2 con capacidades entre 2 y 8', async () => {
        await seedTables(db)
        expect(await contar('rest-1')).toBe(6)
        expect(await contar('rest-2')).toBe(4)
        const rango = await db.get<{ min: number, max: number }>('SELECT MIN(capacity) as min, MAX(capacity) as max FROM restaurant_tables')
        expect(rango).toEqual({ min: 2, max: 8 })
    })

    it('deja ocupada la mesa del pedido de ejemplo de rest-1', async () => {
        const mesa = await db.get<{ restaurant_id: string, status: string }>('SELECT restaurant_id, status FROM restaurant_tables WHERE id = ?', [MESA_PEDIDO_EJEMPLO])
        expect(mesa).toEqual({ restaurant_id: 'rest-1', status: 'ocupada' })
    })

    it('es idempotente', async () => {
        await seedTables(db)
        expect(await contar('rest-1')).toBe(6)
        expect(await contar('rest-2')).toBe(4)
    })
})
