import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../../../../app.js'
import { dbConfig } from '@config/database.js'
import { bearer } from '../../../../test/http.js'

const password = 'password-segura-1'
const registrar = async (email: string) => {
    const res = await request(app).post('/api/v1/auth/register')
        .send({ firstName: 'Ana', lastName: 'Gil', email, password })
    return res.body as { token: string, refreshToken: string, employee: { id: string, role: string } }
}

describe('POST /auth/refresh y /auth/logout', () => {
    beforeAll(async () => { await dbConfig.initialize() })

    it('el login devuelve access y refresh token', async () => {
        await registrar('login@resttek.com')
        const res = await request(app).post('/api/v1/auth/login').send({ email: 'login@resttek.com', password })
        expect(res.status).toBe(200)
        expect(typeof res.body.refreshToken).toBe('string')
        expect(typeof res.body.token).toBe('string')
    })

    it('rota el refresh y el nuevo access sirve para llamar a la API', async () => {
        const sesion = await registrar('rota@resttek.com')
        const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })
        expect(res.status).toBe(200)
        expect(res.body.refreshToken).not.toBe(sesion.refreshToken)

        const mine = await request(app).get('/api/v1/orders/mine').set('Authorization', `Bearer ${res.body.token}`)
        expect(mine.status).toBe(200)
    })

    it('reutilizar un refresh ya rotado da 401 y revoca el nuevo', async () => {
        const sesion = await registrar('reuso@resttek.com')
        const rotado = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })

        const reuso = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })
        expect(reuso.status).toBe(401)

        const nuevo = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: rotado.body.refreshToken })
        expect(nuevo.status).toBe(401)
    })

    it('responde 401 a un refresh inválido o ausente', async () => {
        expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'inventado' })).status).toBe(401)
        expect((await request(app).post('/api/v1/auth/refresh').send({})).status).toBe(401)
    })

    it('logout revoca el refresh (204) y después no se puede renovar', async () => {
        const sesion = await registrar('logout@resttek.com')
        const salir = await request(app).post('/api/v1/auth/logout')
            .set(...bearer({ id: sesion.employee.id, role: sesion.employee.role }))
            .send({ refreshToken: sesion.refreshToken })
        expect(salir.status).toBe(204)

        const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })
        expect(res.status).toBe(401)
    })

    it('logout exige estar autenticado', async () => {
        const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'x' })
        expect(res.status).toBe(401)
    })

    it('logout de otro usuario no revoca mi refresh', async () => {
        const sesion = await registrar('victima@resttek.com')
        await request(app).post('/api/v1/auth/logout')
            .set(...bearer({ id: 'otro-usuario', role: 'cliente' }))
            .send({ refreshToken: sesion.refreshToken })
        const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: sesion.refreshToken })
        expect(res.status).toBe(200)
    })
})
