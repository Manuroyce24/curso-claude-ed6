import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, authorizeRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const tableService = new TableService(tableRepository)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const gestion = ['admin', 'manager']
const sala = ['admin', 'manager', 'camarero']

// El cliente no pertenece a ningún restaurante: sus rutas no pasan por authorizeRestaurant.
router.get('/available', authenticate, authorize(['cliente']), tableController.getAvailable)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)

router.post('/', authenticate, authorizeRestaurant, authorize(gestion), tableController.create)
router.get('/', authenticate, authorizeRestaurant, authorize(sala), tableController.getAll)
router.get('/:id', authenticate, authorizeRestaurant, authorize(sala), tableController.getById)
router.put('/:id', authenticate, authorizeRestaurant, authorize(gestion), tableController.update)
router.patch('/:id/status', authenticate, authorizeRestaurant, authorize(sala), tableController.changeStatus)
router.delete('/:id', authenticate, authorizeRestaurant, authorize(gestion), tableController.delete)

export default router
