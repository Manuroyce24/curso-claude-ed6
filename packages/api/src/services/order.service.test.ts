import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, ForbiddenError } from '@errors/DomainErrors.js'
import type { Actor } from './order.service.js'

const cocinero: Actor = { id: 'emp-1', role: 'cocinero', restaurantId: 'rest-1' }
const cocineroAjeno: Actor = { id: 'emp-2', role: 'cocinero', restaurantId: 'rest-2' }
const admin: Actor = { id: 'adm-1', role: 'admin', restaurantId: null }
const clienteDueno: Actor = { id: 'cli-1', role: 'cliente', restaurantId: null }
const clienteAjeno: Actor = { id: 'cli-2', role: 'cliente', restaurantId: null }

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: 'cli-1',
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando', cocinero)
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando', cocinero))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando', cocinero))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status', cocinero))
            .rejects.toThrow(InvalidOrderStatusError)
    })

    it('should hide the order from staff of another restaurant', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'preparando', cocineroAjeno))
            .rejects.toThrow(OrderNotFoundError)
        expect(testOrder.items[0]!.status).toBe('pendiente')
    })

    it('should hide the order from a client', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'preparando', clienteDueno))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should allow an admin to update any order', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'listo', admin)
        expect(testOrder.items[0]!.status).toBe('listo')
    })

    describe('getById', () => {
        it('should return the order to its owner client', async () => {
            expect((await service.getById('order-1', clienteDueno)).id).toBe('order-1')
        })

        it('should return the order to staff of the same restaurant', async () => {
            expect((await service.getById('order-1', cocinero)).id).toBe('order-1')
        })

        it('should return the order to an admin', async () => {
            expect((await service.getById('order-1', admin)).id).toBe('order-1')
        })

        it('should hide the order from another client', async () => {
            await expect(service.getById('order-1', clienteAjeno)).rejects.toThrow(OrderNotFoundError)
        })

        it('should hide the order from staff of another restaurant', async () => {
            await expect(service.getById('order-1', cocineroAjeno)).rejects.toThrow(OrderNotFoundError)
        })
    })

    describe('listActive', () => {
        it('should use the restaurant of the staff token', async () => {
            const orders = await service.listActive(cocinero)
            expect(orders.map(o => o.id)).toEqual(['order-1'])
        })

        it('should reject a restaurant that is not the staff one', async () => {
            await expect(service.listActive(cocinero, 'rest-2')).rejects.toThrow(ForbiddenError)
        })

        it('should require a restaurant for an admin', async () => {
            await expect(service.listActive(admin)).rejects.toThrow()
        })

        it('should let an admin list any restaurant', async () => {
            const orders = await service.listActive(admin, 'rest-1')
            expect(orders).toHaveLength(1)
        })
    })
})
