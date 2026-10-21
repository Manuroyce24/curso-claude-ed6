import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'

vi.hoisted(() => { process.env.AUTH_RATE_LIMIT_MAX = '3' })

import app from '../../../../app.js'
import { dbConfig } from '@config/database.js'

describe('rate limiting de /auth', () => {
    beforeAll(async () => { await dbConfig.initialize() })

    it('limita los intentos de login por IP', async () => {
        for (let i = 0; i < 3; i++) {
            const res = await request(app).post('/api/v1/auth/login').send({ email: 'x@x.com', password: 'mala' })
            expect(res.status).toBe(401)
        }
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'x@x.com', password: 'mala' })
        expect(res.status).toBe(429)
    })

    it('limita el registro por IP', async () => {
        const intento = () => request(app).post('/api/v1/auth/register').send({})
        const estados: number[] = []
        for (let i = 0; i < 4; i++) estados.push((await intento()).status)
        expect(estados.slice(0, 3)).not.toContain(429)
        expect(estados[3]).toBe(429)
    })
})
