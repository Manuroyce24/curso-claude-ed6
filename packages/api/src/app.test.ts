import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './app.js'

describe('cabeceras de seguridad', () => {
    it('no revela el framework y envía cabeceras de helmet', async () => {
        const res = await request(app).get('/health')
        expect(res.headers['x-powered-by']).toBeUndefined()
        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(res.headers['x-frame-options']).toBeDefined()
    })
})
