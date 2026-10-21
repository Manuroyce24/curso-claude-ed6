import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { crearLimitador } from './rateLimit.js'

describe('crearLimitador', () => {
    const app = express()
    app.post('/login', crearLimitador({ max: 3, windowMs: 60_000 }), (_req, res) => { res.status(200).json({ ok: true }) })

    it('responde 429 al superar el máximo de peticiones', async () => {
        for (let i = 0; i < 3; i++) {
            expect((await request(app).post('/login')).status).toBe(200)
        }
        const res = await request(app).post('/login')
        expect(res.status).toBe(429)
        expect(res.body.error).toBe('TooManyRequests')
    })
})
