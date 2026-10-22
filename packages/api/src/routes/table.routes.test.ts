import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, crearRestaurante } from '../test/http.js'

const managerA = { id: 'man-a', role: 'manager', restaurantId: 'rest-a' }
const cliente = { id: 'cli-1', role: 'cliente', restaurantId: null }

const URL_A = '/api/v1/restaurants/rest-a/tables'

describe('rutas /restaurants/:restaurantId/tables', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await crearRestaurante('rest-a')
        await crearRestaurante('rest-b')
    })

    describe('montaje', () => {
        it('un manager crea y lista mesas de su restaurante', async () => {
            const creada = await request(app).post(URL_A).set(...bearer(managerA)).send({ number: 1, capacity: 4 })
            expect(creada.status).toBe(201)

            const lista = await request(app).get(URL_A).set(...bearer(managerA))
            expect(lista.status).toBe(200)
            expect(lista.body.map((m: { id: string }) => m.id)).toContain(creada.body.id)
        })

        it('resuelve /available antes que /:id', async () => {
            const res = await request(app).get(`${URL_A}/available?people=2`).set(...bearer(cliente))
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })
    })
})
