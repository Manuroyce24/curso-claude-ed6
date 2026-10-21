import { Router } from 'express'
import { crearLimitadorAuth } from '@shared/infrastructure/http/rateLimit.js'
import { authController } from '@employee/infrastructure/http/dependencies.js'

const router = Router()

router.post('/login', crearLimitadorAuth(), authController.login)
router.post('/register', crearLimitadorAuth(), authController.register)

export default router
