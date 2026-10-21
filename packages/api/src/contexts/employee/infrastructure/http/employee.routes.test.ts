import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../../../../app.js'
import { dbConfig } from '@config/database.js'
import { bearer } from '../../../../test/http.js'

const admin = { id: 'adm-1', role: 'admin', restaurantId: null }

describe('GET /employees (paginación)', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        for (let i = 0; i < 105; i++) {
            await dbConfig.run(
                'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, NULL)',
                [`e-${i}`, 'N', 'A', `e${i}@resttek.com`, 'hash', 'cliente']
            )
        }
    })

    it('limita limit a 100', async () => {
        const res = await request(app).get('/api/v1/employees?limit=99999').set(...bearer(admin))
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(100)
    })

    it('usa el valor por defecto si limit es negativo', async () => {
        const res = await request(app).get('/api/v1/employees?limit=-5').set(...bearer(admin))
        expect(res.body).toHaveLength(10)
    })

    it('ignora un offset negativo', async () => {
        const res = await request(app).get('/api/v1/employees?offset=-3').set(...bearer(admin))
        expect(res.status).toBe(200)
    })
})
