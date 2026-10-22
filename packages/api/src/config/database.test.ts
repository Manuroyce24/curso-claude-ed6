import { describe, it, expect, beforeAll } from 'vitest'
import { dbConfig } from './database.js'

describe('migraciones', () => {
    beforeAll(async () => { await dbConfig.initialize() })

    it('crea la tabla refresh_tokens con sus columnas', async () => {
        const columnas = await dbConfig.all<{ name: string }>("PRAGMA table_info('refresh_tokens')")
        expect(columnas.map(c => c.name)).toEqual(expect.arrayContaining([
            'id', 'employee_id', 'family_id', 'token_hash', 'expires_at', 'revoked_at', 'replaced_by', 'created_at'
        ]))
    })

    it('indexa token_hash', async () => {
        const indices = await dbConfig.all<{ name: string }>("PRAGMA index_list('refresh_tokens')")
        expect(indices.map(i => i.name)).toContain('idx_refresh_tokens_hash')
    })

    it('crea la tabla restaurant_tables con sus columnas', async () => {
        const columnas = await dbConfig.all<{ name: string }>("PRAGMA table_info('restaurant_tables')")
        expect(columnas.map(c => c.name)).toEqual(expect.arrayContaining([
            'id', 'restaurant_id', 'number', 'description', 'capacity', 'status', 'created_at', 'updated_at'
        ]))
    })

    it('impide repetir el número de mesa dentro de un restaurante', async () => {
        const ahora = new Date().toISOString()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['rest-mig', 'R', 'C', 'r@r.com', '+34600000000', 'A', 'B', ahora, ahora]
        )
        const insertar = (id: string) => dbConfig.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, 1, NULL, 4, ?, ?, ?)',
            [id, 'rest-mig', 'libre', ahora, ahora]
        )
        await insertar('mesa-mig-1')
        await expect(insertar('mesa-mig-2')).rejects.toThrow(/UNIQUE/)
    })
})
