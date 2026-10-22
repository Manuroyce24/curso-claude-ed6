import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, crearRestaurante, crearMesa } from '../test/http.js'

const managerA = { id: 'man-a', role: 'manager', restaurantId: 'rest-a' }
const managerB = { id: 'man-b', role: 'manager', restaurantId: 'rest-b' }
const camareroA = { id: 'cam-a', role: 'camarero', restaurantId: 'rest-a' }
const cocineroA = { id: 'coc-a', role: 'cocinero', restaurantId: 'rest-a' }
const admin = { id: 'adm-1', role: 'admin', restaurantId: null }
const cliente = { id: 'cli-1', role: 'cliente', restaurantId: null }

const URL_A = '/api/v1/restaurants/rest-a/tables'

describe('rutas /restaurants/:restaurantId/tables', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await crearRestaurante('rest-a')
        await crearRestaurante('rest-b')
        await crearMesa('mesa-b1', 'rest-b', 1, 4, 'reservada')
    })

    it('crearMesa inserta mesas para los tests', async () => {
        const mesa = await dbConfig.get<{ status: string, capacity: number }>('SELECT status, capacity FROM restaurant_tables WHERE id = ?', ['mesa-b1'])
        expect(mesa).toEqual({ status: 'reservada', capacity: 4 })
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

    describe('gestión de mesas', () => {
        let idMesa: string

        beforeAll(async () => {
            const res = await request(app).post(URL_A).set(...bearer(managerA)).send({ number: 10, description: 'Terraza', capacity: 4 })
            idMesa = res.body.id
        })

        it('rechaza peticiones sin token con 401', async () => {
            expect((await request(app).get(URL_A)).status).toBe(401)
        })

        it('rechaza a un cocinero con 403', async () => {
            expect((await request(app).get(URL_A).set(...bearer(cocineroA))).status).toBe(403)
        })

        it('rechaza a un manager de otro restaurante con 403', async () => {
            expect((await request(app).get(URL_A).set(...bearer(managerB))).status).toBe(403)
            expect((await request(app).get(`${URL_A}/${idMesa}`).set(...bearer(managerB))).status).toBe(403)
        })

        it('rechaza a un cliente con 403', async () => {
            expect((await request(app).get(URL_A).set(...bearer(cliente))).status).toBe(403)
        })

        it('permite a un camarero listar y ver mesas pero no crearlas, editarlas ni borrarlas', async () => {
            expect((await request(app).get(URL_A).set(...bearer(camareroA))).status).toBe(200)
            expect((await request(app).get(`${URL_A}/${idMesa}`).set(...bearer(camareroA))).status).toBe(200)
            expect((await request(app).post(URL_A).set(...bearer(camareroA)).send({ number: 90, capacity: 2 })).status).toBe(403)
            expect((await request(app).put(`${URL_A}/${idMesa}`).set(...bearer(camareroA)).send({ number: 10, capacity: 2 })).status).toBe(403)
            expect((await request(app).delete(`${URL_A}/${idMesa}`).set(...bearer(camareroA))).status).toBe(403)
        })

        it('devuelve 404 para una mesa inexistente', async () => {
            expect((await request(app).get(`${URL_A}/no-existe`).set(...bearer(managerA))).status).toBe(404)
        })

        it('devuelve 400 con datos inválidos', async () => {
            const res = await request(app).post(URL_A).set(...bearer(managerA)).send({ number: 0, capacity: 4 })
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidTableNumberError')
        })

        it('devuelve 409 si el número ya existe en el restaurante', async () => {
            const res = await request(app).post(URL_A).set(...bearer(managerA)).send({ number: 10, capacity: 2 })
            expect(res.status).toBe(409)
            expect(res.body.error).toBe('DuplicatedTableNumberError')
        })

        it('un manager edita una mesa con PUT', async () => {
            const res = await request(app).put(`${URL_A}/${idMesa}`).set(...bearer(managerA))
                .send({ number: 10, description: 'Terraza cubierta', capacity: 6, status: 'reservada' })
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ description: 'Terraza cubierta', capacity: 6, status: 'reservada' })
        })

        it('un camarero cambia el estado con PATCH /status', async () => {
            const res = await request(app).patch(`${URL_A}/${idMesa}/status`).set(...bearer(camareroA)).send({ status: 'ocupada' })
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('ocupada')
        })

        it('no se puede borrar una mesa ocupada (409) y sí una libre (204)', async () => {
            expect((await request(app).delete(`${URL_A}/${idMesa}`).set(...bearer(managerA))).status).toBe(409)
            await request(app).patch(`${URL_A}/${idMesa}/status`).set(...bearer(camareroA)).send({ status: 'libre' })
            expect((await request(app).delete(`${URL_A}/${idMesa}`).set(...bearer(managerA))).status).toBe(204)
            expect((await request(app).get(`${URL_A}/${idMesa}`).set(...bearer(managerA))).status).toBe(404)
        })

        it('un admin gestiona mesas de cualquier restaurante', async () => {
            const res = await request(app).post('/api/v1/restaurants/rest-b/tables').set(...bearer(admin)).send({ number: 20, capacity: 2 })
            expect(res.status).toBe(201)
        })
    })
})
