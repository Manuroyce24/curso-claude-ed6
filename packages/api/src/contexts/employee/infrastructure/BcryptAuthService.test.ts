import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { BcryptAuthService } from './BcryptAuthService.js'
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '@config/env.js'

describe('BcryptAuthService.generateToken', () => {
    const service = new BcryptAuthService()

    it('firma con HS256, issuer y audience', () => {
        const token = service.generateToken({ id: 'u1', role: 'admin' })
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE }) as jwt.JwtPayload
        expect(decoded.id).toBe('u1')
    })

    it('el access token caduca a los 15 minutos', () => {
        const token = service.generateToken({ id: 'u1', role: 'admin' })
        const { iat, exp } = jwt.decode(token) as jwt.JwtPayload
        expect(exp! - iat!).toBe(15 * 60)
    })

    it('genera refresh tokens opacos, distintos y largos', () => {
        const a = service.generateRefreshToken()
        const b = service.generateRefreshToken()
        expect(a).not.toBe(b)
        expect(a.length).toBeGreaterThanOrEqual(43)
        expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('hashRefreshToken es determinista y no revela el token', () => {
        const token = service.generateRefreshToken()
        const hash = service.hashRefreshToken(token)
        expect(service.hashRefreshToken(token)).toBe(hash)
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
        expect(hash).not.toContain(token)
    })
})
