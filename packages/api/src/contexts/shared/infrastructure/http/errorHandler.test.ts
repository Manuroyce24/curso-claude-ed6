import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import { ForbiddenError, TableNotFoundError, DuplicatedTableNumberError, TableNotAvailableError } from '@errors/DomainErrors.js'

function fakeResponse() {
    const res = { status: vi.fn(), json: vi.fn() }
    res.status.mockReturnValue(res)
    return res
}

describe('errorHandler', () => {
    it('traduce ForbiddenError a 403', () => {
        const res = fakeResponse()
        errorHandler(new ForbiddenError(), {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(403)
    })

    it('traduce TableNotFoundError a 404', () => {
        const res = fakeResponse()
        errorHandler(new TableNotFoundError(), {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(404)
    })

    it.each([new DuplicatedTableNumberError(), new TableNotAvailableError()])('traduce %s a 409', (error) => {
        const res = fakeResponse()
        errorHandler(error, {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(409)
    })
})

describe('errorHandler (errores de body-parser)', () => {
    const conEstado = (status: number, type: string) => Object.assign(new Error('x'), { status, type })

    it('devuelve 400 para JSON malformado', () => {
        const res = fakeResponse()
        errorHandler(conEstado(400, 'entity.parse.failed'), {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(400)
    })

    it('devuelve 413 para un cuerpo demasiado grande', () => {
        const res = fakeResponse()
        errorHandler(conEstado(413, 'entity.too.large'), {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(413)
    })

    it('mantiene 500 genérico para errores desconocidos', () => {
        const res = fakeResponse()
        errorHandler(new Error('SQLITE_ERROR: no such table'), {} as Request, res as unknown as Response, vi.fn())
        expect(res.status).toHaveBeenCalledWith(500)
        expect(JSON.stringify(res.json.mock.calls)).not.toContain('SQLITE')
    })
})
