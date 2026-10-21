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
})
