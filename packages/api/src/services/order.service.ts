import { randomUUID } from 'crypto'
import type { Order, OrderItem } from '@models/order.model.js'
import { normalizeOrderStatus } from '@models/order.model.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import { RestaurantIdRequiredError, OrderNotFoundError, ForbiddenError } from '@errors/DomainErrors.js'

export interface Actor {
    id: string
    role: string
    restaurantId?: string | null
}

const esAdmin = (actor: Actor): boolean => actor.role === 'admin'
const esPersonalDe = (actor: Actor, restaurantId: string): boolean =>
    !!actor.restaurantId && actor.restaurantId === restaurantId

export interface CreateOrderRequest {
    restaurantId: string
    tableId: string | null
    clientId: string | null
    items: {
        dishId: string
        quantity: number
        notes: string | null
    }[]
}

export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) {}

    async create(request: CreateOrderRequest): Promise<Order> {
        if (!request.restaurantId || request.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        const items: OrderItem[] = []
        for (const item of request.items) {
            for (let i = 0; i < item.quantity; i++) {
                items.push({
                    id: randomUUID(),
                    dishId: item.dishId,
                    quantity: 1,
                    notes: item.notes,
                    status: 'pendiente'
                })
            }
        }

        const order: Order = {
            id: randomUUID(),
            restaurantId: request.restaurantId,
            tableId: request.tableId,
            clientId: request.clientId,
            createdAt: new Date(),
            items
        }

        await this.orderRepository.create(order)

        return order
    }

    async listActive(actor: Actor, requestedRestaurantId?: string): Promise<Order[]> {
        let restaurantId: string
        if (esAdmin(actor)) {
            if (!requestedRestaurantId) throw new RestaurantIdRequiredError()
            restaurantId = requestedRestaurantId
        } else {
            if (!actor.restaurantId) throw new ForbiddenError()
            if (requestedRestaurantId && requestedRestaurantId !== actor.restaurantId) {
                throw new ForbiddenError()
            }
            restaurantId = actor.restaurantId
        }
        return this.orderRepository.findActiveByRestaurant(restaurantId)
    }

    async getById(orderId: string, actor: Actor): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order || !this.puedeVer(order, actor)) {
            throw new OrderNotFoundError()
        }
        return order
    }

    async getByClientId(clientId: string): Promise<Order[]> {
        return this.orderRepository.findByClientId(clientId)
    }

    async updateItemStatus(orderId: string, itemId: string, status: string, actor: Actor): Promise<void> {
        const order = await this.orderRepository.findById(orderId)
        if (!order || !(esAdmin(actor) || esPersonalDe(actor, order.restaurantId))) {
            throw new OrderNotFoundError()
        }

        const item = order.items.find(i => i.id === itemId)
        if (!item) {
            throw new OrderNotFoundError() // Or ItemNotFoundError
        }

        const normalizedStatus = normalizeOrderStatus(status)
        item.status = normalizedStatus

        await this.orderRepository.updateItemStatus(orderId, itemId, normalizedStatus)
    }

    private puedeVer(order: Order, actor: Actor): boolean {
        return esAdmin(actor)
            || esPersonalDe(actor, order.restaurantId)
            || (!!order.clientId && order.clientId === actor.id)
    }
}
