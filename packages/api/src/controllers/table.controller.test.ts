import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import { TableController } from './table.controller.js'
import { TableService } from '@services/table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { InvalidPartySizeError, TableNotFoundError } from '@errors/DomainErrors.js'

function fakeResponse() {
    const res = { status: vi.fn(), json: vi.fn(), send: vi.fn() }
    res.status.mockReturnValue(res)
    return res
}

const peticion = (params: Record<string, string>, body: unknown = {}, query: Record<string, unknown> = {}) =>
    ({ params, body, query }) as unknown as Request

describe('TableController', () => {
    let service: TableService
    let controller: TableController
    let idMesa: string

    beforeEach(async () => {
        service = new TableService(new MockTableRepository())
        controller = new TableController(service)
        idMesa = (await service.create('rest-a', { number: 1, description: 'Ventana', capacity: 4 })).id
        await service.create('rest-a', { number: 2, capacity: 2 })
    })

    const ejecutar = async (handler: keyof TableController, req: Request) => {
        const res = fakeResponse()
        const next = vi.fn()
        await (controller[handler] as (req: Request, res: Response, next: () => void) => Promise<void>)(req, res as unknown as Response, next)
        return { res, next }
    }

    it('create responde 201 con la mesa en JSON', async () => {
        const { res } = await ejecutar('create', peticion({ restaurantId: 'rest-a' }, { number: 3, capacity: 6 }))
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json.mock.calls[0]![0]).toMatchObject({ number: 3, capacity: 6, status: 'libre', restaurantId: 'rest-a', description: null })
    })

    it('getAll responde 200 con las mesas del restaurante', async () => {
        const { res } = await ejecutar('getAll', peticion({ restaurantId: 'rest-a' }))
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]![0]).toHaveLength(2)
    })

    it('getById pasa TableNotFoundError a next si la mesa no es del restaurante', async () => {
        const { next } = await ejecutar('getById', peticion({ restaurantId: 'rest-b', id: idMesa }))
        expect(next.mock.calls[0]![0]).toBeInstanceOf(TableNotFoundError)
    })

    it('update responde 200 con la mesa editada', async () => {
        const { res } = await ejecutar('update', peticion({ restaurantId: 'rest-a', id: idMesa }, { number: 1, description: null, capacity: 8, status: 'reservada' }))
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]![0]).toMatchObject({ capacity: 8, status: 'reservada' })
    })

    it('changeStatus responde 200 con el nuevo estado', async () => {
        const { res } = await ejecutar('changeStatus', peticion({ restaurantId: 'rest-a', id: idMesa }, { status: 'ocupada' }))
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]![0]).toMatchObject({ id: idMesa, status: 'ocupada' })
    })

    it('delete responde 204', async () => {
        const { res } = await ejecutar('delete', peticion({ restaurantId: 'rest-a', id: idMesa }))
        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalled()
    })

    it('getAvailable convierte people a número', async () => {
        const { res } = await ejecutar('getAvailable', peticion({ restaurantId: 'rest-a' }, {}, { people: '3' }))
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]![0].map((m: { number: number }) => m.number)).toEqual([1])
    })

    it.each([undefined, 'abc', '', ['2', '3']])('getAvailable rechaza people=%s', async (people) => {
        const { next } = await ejecutar('getAvailable', peticion({ restaurantId: 'rest-a' }, {}, { people }))
        expect(next.mock.calls[0]![0]).toBeInstanceOf(InvalidPartySizeError)
    })

    it('occupy responde 200 con la mesa ocupada', async () => {
        const { res } = await ejecutar('occupy', peticion({ restaurantId: 'rest-a', id: idMesa }))
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]![0]).toMatchObject({ id: idMesa, status: 'ocupada' })
    })
})
