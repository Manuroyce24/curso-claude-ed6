import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import { ForbiddenError } from '@errors/DomainErrors.js'

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
})
