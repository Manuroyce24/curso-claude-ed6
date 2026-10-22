import { randomUUID } from 'crypto'
import type { Order, OrderItem } from '@models/order.model.js'
import { normalizeOrderStatus } from '@models/order.model.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { DishRepository } from '@repositories/dish.repository.js'
import type { TableRepository } from '@repositories/table.repository.js'
import { RestaurantIdRequiredError, OrderNotFoundError, ForbiddenError, InvalidOrderError } from '@errors/DomainErrors.js'

const MAX_LINEAS_PEDIDO = 50
const MAX_UNIDADES_POR_LINEA = 50

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
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly dishRepository: DishRepository,
        private readonly tableRepository: TableRepository
    ) {}

    async create(request: CreateOrderRequest): Promise<Order> {
        if (!request.restaurantId || request.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        await this.validarMesa(request)
        await this.validarLineas(request)

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

    // Un pedido con mesa solo se admite si la mesa es del restaurante y está ocupada.
    private async validarMesa(request: CreateOrderRequest): Promise<void> {
        const tableId: unknown = request.tableId
        if (tableId === null) return
        const table = typeof tableId === 'string'
            ? await this.tableRepository.findByIdInRestaurant(tableId, request.restaurantId)
            : null
        if (!table || table.status !== 'ocupada') {
            throw new InvalidOrderError('Table is not occupied in this restaurant')
        }
    }

    private async validarLineas(request: CreateOrderRequest): Promise<void> {
        const lineas: unknown = request.items
        if (!Array.isArray(lineas) || lineas.length === 0 || lineas.length > MAX_LINEAS_PEDIDO) {
            throw new InvalidOrderError(`Items must be a list of 1 to ${MAX_LINEAS_PEDIDO} lines`)
        }

        for (const linea of lineas) {
            const { dishId, quantity } = (linea ?? {}) as { dishId?: unknown, quantity?: unknown }
            if (typeof quantity !== 'number' || !Number.isInteger(quantity)
                || quantity < 1 || quantity > MAX_UNIDADES_POR_LINEA) {
                throw new InvalidOrderError(`Quantity must be an integer between 1 and ${MAX_UNIDADES_POR_LINEA}`)
            }
            const dish = typeof dishId === 'string' ? await this.dishRepository.findById(dishId) : null
            if (!dish || dish.restaurantId !== request.restaurantId) {
                throw new InvalidOrderError('Dish does not belong to the restaurant')
            }
        }
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
