import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, crearRestaurante, crearPlato, crearPedido } from '../test/http.js'

const cocineroA = { id: 'emp-a', role: 'cocinero', restaurantId: 'rest-a' }
const cocineroB = { id: 'emp-b', role: 'cocinero', restaurantId: 'rest-b' }
const clienteDueno = { id: 'cli-1', role: 'cliente', restaurantId: null }
const clienteAjeno = { id: 'cli-2', role: 'cliente', restaurantId: null }
const admin = { id: 'adm-1', role: 'admin', restaurantId: null }

describe('rutas /orders', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await crearRestaurante('rest-a')
        await crearRestaurante('rest-b')
        await crearPlato('dish-a', 'rest-a')
        await crearPlato('dish-b', 'rest-b')
        await crearPedido('order-a', 'rest-a', 'cli-1', 'dish-a', 'item-a')
        await crearPedido('order-b', 'rest-b', 'cli-9', 'dish-b', 'item-b')
    })

    describe('GET /orders/active', () => {
        it('rechaza a un cliente con 403', async () => {
            const res = await request(app).get('/api/v1/orders/active?restaurantId=rest-a').set(...bearer(clienteDueno))
            expect(res.status).toBe(403)
        })

        it('devuelve solo los pedidos del restaurante del token', async () => {
            const res = await request(app).get('/api/v1/orders/active').set(...bearer(cocineroA))
            expect(res.status).toBe(200)
            expect(res.body.map((o: { id: string }) => o.id)).toEqual(['order-a'])
        })

        it('rechaza pedir otro restaurante con 403', async () => {
            const res = await request(app).get('/api/v1/orders/active?restaurantId=rest-b').set(...bearer(cocineroA))
            expect(res.status).toBe(403)
        })

        it('permite al admin indicar el restaurante', async () => {
            const res = await request(app).get('/api/v1/orders/active?restaurantId=rest-b').set(...bearer(admin))
            expect(res.status).toBe(200)
            expect(res.body).toHaveLength(1)
        })
    })

    describe('GET /orders/:id', () => {
        it('oculta un pedido ajeno a otro cliente (404)', async () => {
            const res = await request(app).get('/api/v1/orders/order-a').set(...bearer(clienteAjeno))
            expect(res.status).toBe(404)
        })

        it('oculta un pedido a personal de otro restaurante (404)', async () => {
            const res = await request(app).get('/api/v1/orders/order-a').set(...bearer(cocineroB))
            expect(res.status).toBe(404)
        })

        it('lo devuelve a su cliente y al personal del restaurante', async () => {
            expect((await request(app).get('/api/v1/orders/order-a').set(...bearer(clienteDueno))).status).toBe(200)
            expect((await request(app).get('/api/v1/orders/order-a').set(...bearer(cocineroA))).status).toBe(200)
        })
    })

    describe('PATCH /orders/:orderId/items/:itemId/status', () => {
        const url = '/api/v1/orders/order-a/items/item-a/status'

        it('rechaza a un cliente con 403', async () => {
            const res = await request(app).patch(url).set(...bearer(clienteDueno)).send({ status: 'entregado' })
            expect(res.status).toBe(403)
        })

        it('oculta el pedido al personal de otro restaurante (404)', async () => {
            const res = await request(app).patch(url).set(...bearer(cocineroB)).send({ status: 'entregado' })
            expect(res.status).toBe(404)
        })

        it('permite al personal del restaurante', async () => {
            const res = await request(app).patch(url).set(...bearer(cocineroA)).send({ status: 'preparando' })
            expect(res.status).toBe(204)
        })
    })

    describe('POST /orders', () => {
        it('crea el pedido de un cliente', async () => {
            const res = await request(app).post('/api/v1/orders').set(...bearer(clienteDueno))
                .send({ restaurantId: 'rest-a', items: [{ dishId: 'dish-a', quantity: 2, notes: null }] })
            expect(res.status).toBe(201)
        })

        it('rechaza una cantidad desorbitada con 400 sin colgarse', async () => {
            const res = await request(app).post('/api/v1/orders').set(...bearer(clienteDueno))
                .send({ restaurantId: 'rest-a', items: [{ dishId: 'dish-a', quantity: 1e9, notes: null }] })
            expect(res.status).toBe(400)
        })

        it('rechaza un plato de otro restaurante con 400', async () => {
            const res = await request(app).post('/api/v1/orders').set(...bearer(clienteDueno))
                .send({ restaurantId: 'rest-a', items: [{ dishId: 'dish-b', quantity: 1, notes: null }] })
            expect(res.status).toBe(400)
        })

        it('no filtra mensajes internos en errores inesperados', async () => {
            const res = await request(app).post('/api/v1/orders').set(...bearer(clienteDueno)).send({})
            expect(res.status).toBe(400)
            expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|undefined|TypeError/)
        })
    })
})
