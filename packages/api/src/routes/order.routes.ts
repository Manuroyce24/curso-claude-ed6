import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteDishRepository } from '@repositories/dish.repository.js'
import { dbConfig } from '@config/database.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const orderService = new OrderService(orderRepository, new SqliteDishRepository(dbConfig))
const orderController = new OrderController(orderService)

const router = Router()

const personal = ['cocinero', 'camarero', 'manager', 'admin']

router.post('/', authenticate, authorize(['cliente', 'camarero', 'manager', 'admin']), orderController.createOrder.bind(orderController))
router.get('/active', authenticate, authorize(personal), orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.patch('/:orderId/items/:itemId/status', authenticate, authorize(personal), orderController.updateItemStatus.bind(orderController))

export default router
