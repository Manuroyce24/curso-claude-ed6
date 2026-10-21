import type { Response, NextFunction } from 'express'
import type { OrderService, Actor } from '@services/order.service.js'
import type { AuthRequest } from '@shared/infrastructure/http/middlewares.js'
import { ForbiddenError } from '@errors/DomainErrors.js'

const actorDe = (req: AuthRequest): Actor => {
    if (!req.user) throw new ForbiddenError()
    return { id: req.user.id, role: req.user.role, restaurantId: req.user.restaurantId ?? null }
}

export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const actor = actorDe(req)
            const { restaurantId, tableId, items } = req.body ?? {}
            const order = await this.orderService.create({
                restaurantId,
                tableId: tableId ?? null,
                clientId: actor.id,
                items
            })
            res.status(201).json(order)
        } catch (error) {
            next(error)
        }
    }

    async getActiveOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { restaurantId } = req.query
            const solicitado = typeof restaurantId === 'string' ? restaurantId : undefined
            const orders = await this.orderService.listActive(actorDe(req), solicitado)
            res.status(200).json(orders)
        } catch (error) {
            next(error)
        }
    }

    async getMyOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const orders = await this.orderService.getByClientId(actorDe(req).id)
            res.status(200).json(orders)
        } catch (error) {
            next(error)
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const order = await this.orderService.getById(req.params.id as string, actorDe(req))
            res.status(200).json(order)
        } catch (error) {
            next(error)
        }
    }

    async updateItemStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const orderId = req.params.orderId as string
            const itemId = req.params.itemId as string
            const { status } = req.body ?? {}

            await this.orderService.updateItemStatus(orderId, itemId, status, actorDe(req))
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
