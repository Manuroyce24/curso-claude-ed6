import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { authenticate, authorizeRestaurant, type AuthRequest } from './middlewares.js'
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '@config/env.js'

function ejecutar(token: string) {
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest
    const res = { status: vi.fn(), json: vi.fn() }
    res.status.mockReturnValue(res)
    const next = vi.fn()
    authenticate(req, res as unknown as Response, next)
    return { req, res, next }
}

const payload = { id: 'u1', role: 'admin', restaurantId: null }
const opciones: jwt.SignOptions = { algorithm: 'HS256', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }

describe('authenticate', () => {
    it('acepta un token firmado con el secreto configurado', () => {
        const { req, next } = ejecutar(jwt.sign(payload, JWT_SECRET, opciones))
        expect(next).toHaveBeenCalled()
        expect(req.user?.role).toBe('admin')
    })

    it('rechaza un token sin issuer ni audience', () => {
        const { res, next } = ejecutar(jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' }))
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
    })

    it('rechaza un token firmado con el secreto antiguo por defecto', () => {
        const { res, next } = ejecutar(jwt.sign(payload, 'super-secret-resttek-key'))
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
    })

    it('rechaza un token firmado con otro algoritmo', () => {
        const { res, next } = ejecutar(jwt.sign(payload, JWT_SECRET, { ...opciones, algorithm: 'HS512' }))
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
    })
})

describe('authorizeRestaurant', () => {
    function ejecutar(user: AuthRequest['user'], restaurantId: string) {
        const req = { user, params: { restaurantId } } as unknown as AuthRequest
        const res = { status: vi.fn(), json: vi.fn() }
        res.status.mockReturnValue(res)
        const next = vi.fn()
        authorizeRestaurant(req, res as unknown as Response, next)
        return { res, next }
    }

    it('deja pasar al admin a cualquier restaurante', () => {
        expect(ejecutar({ id: 'a', role: 'admin', restaurantId: null }, 'rest-1').next).toHaveBeenCalled()
    })

    it('deja pasar al personal de ese restaurante', () => {
        expect(ejecutar({ id: 'm', role: 'manager', restaurantId: 'rest-1' }, 'rest-1').next).toHaveBeenCalled()
    })

    it('responde 403 al personal de otro restaurante', () => {
        const { res, next } = ejecutar({ id: 'm', role: 'manager', restaurantId: 'rest-2' }, 'rest-1')
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(403)
    })

    it('responde 403 a un usuario sin restaurante', () => {
        expect(ejecutar({ id: 'c', role: 'cliente', restaurantId: null }, 'rest-1').res.status).toHaveBeenCalledWith(403)
    })

    it('responde 403 si no hay usuario', () => {
        expect(ejecutar(undefined, 'rest-1').res.status).toHaveBeenCalledWith(403)
    })
})
