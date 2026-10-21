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
})
