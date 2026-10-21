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

describe('CORS', () => {
    it('permite un origen de la lista blanca', async () => {
        const res = await request(app).get('/health').set('Origin', 'http://localhost:4201')
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4201')
    })

    it('no concede CORS a un origen desconocido', async () => {
        const res = await request(app).get('/health').set('Origin', 'https://evil.example.com')
        expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
})
