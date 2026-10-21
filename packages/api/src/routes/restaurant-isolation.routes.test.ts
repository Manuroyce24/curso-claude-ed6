import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, crearRestaurante, crearPlato } from '../test/http.js'

const managerA = { id: 'man-a', role: 'manager', restaurantId: 'rest-a' }
const admin = { id: 'adm-1', role: 'admin', restaurantId: null }

describe('aislamiento por restaurante en platos e ingredientes', () => {
    let idIngredienteB = ''

    beforeAll(async () => {
        await dbConfig.initialize()
        await crearRestaurante('rest-a')
        await crearRestaurante('rest-b')
        await crearPlato('dish-b', 'rest-b')
        const res = await request(app).post('/api/v1/restaurants/rest-b/ingredients').set(...bearer(admin))
            .send({ name: 'Sal', unit: 'kg', currentStock: 1 })
        idIngredienteB = res.body.id
    })

    describe('platos', () => {
        it('un manager no lista los platos de otro restaurante', async () => {
            const res = await request(app).get('/api/v1/restaurants/rest-b/dishes').set(...bearer(managerA))
            expect(res.status).toBe(403)
        })

        it('un manager no crea platos en otro restaurante', async () => {
            const res = await request(app).post('/api/v1/restaurants/rest-b/dishes').set(...bearer(managerA))
                .send({ name: 'X', price: 5, category: 'principal' })
            expect(res.status).toBe(403)
        })

        it('un manager no edita ni borra un plato de otro restaurante usando su propia URL', async () => {
            const put = await request(app).put('/api/v1/restaurants/rest-a/dishes/dish-b').set(...bearer(managerA))
                .send({ name: 'Hackeado', price: 5, category: 'principal', available: true })
            expect(put.status).toBe(404)
            const del = await request(app).delete('/api/v1/restaurants/rest-a/dishes/dish-b').set(...bearer(managerA))
            expect(del.status).toBe(404)
        })

        it('el plato de otro restaurante sigue intacto', async () => {
            const res = await request(app).get('/api/v1/restaurants/rest-b/dishes/dish-b').set(...bearer(admin))
            expect(res.status).toBe(200)
            expect(res.body.name).toBe('Plato dish-b')
        })

        it('un manager gestiona los platos de su restaurante', async () => {
            const res = await request(app).post('/api/v1/restaurants/rest-a/dishes').set(...bearer(managerA))
                .send({ name: 'Paella', price: 12, category: 'principal' })
            expect(res.status).toBe(201)
        })
    })

    describe('ingredientes', () => {
        it('un manager no lista los ingredientes de otro restaurante', async () => {
            const res = await request(app).get('/api/v1/restaurants/rest-b/ingredients').set(...bearer(managerA))
            expect(res.status).toBe(403)
        })

        it('un manager no lee un ingrediente de otro restaurante por su propia URL', async () => {
            const res = await request(app).get(`/api/v1/restaurants/rest-a/ingredients/${idIngredienteB}`).set(...bearer(managerA))
            expect(res.status).toBe(404)
        })
    })

    describe('restaurantes', () => {
        it('un cliente no puede leer los datos de un restaurante autenticado', async () => {
            const res = await request(app).get('/api/v1/restaurants/rest-a')
                .set(...bearer({ id: 'cli-1', role: 'cliente', restaurantId: null }))
            expect(res.status).toBe(403)
        })

        it('un manager no lee otro restaurante', async () => {
            const res = await request(app).get('/api/v1/restaurants/rest-b').set(...bearer(managerA))
            expect(res.status).toBe(403)
        })

        it('un manager lee el suyo y el admin cualquiera', async () => {
            expect((await request(app).get('/api/v1/restaurants/rest-a').set(...bearer(managerA))).status).toBe(200)
            expect((await request(app).get('/api/v1/restaurants/rest-b').set(...bearer(admin))).status).toBe(200)
        })
    })
})
