import { Router } from 'express'
import { authenticate } from '@shared/infrastructure/http/middlewares.js'
import { crearLimitadorAuth } from '@shared/infrastructure/http/rateLimit.js'
import { authController } from '@employee/infrastructure/http/dependencies.js'

const router = Router()

router.post('/login', crearLimitadorAuth(), authController.login)
router.post('/register', crearLimitadorAuth(), authController.register)

router.post('/refresh', crearLimitadorAuth(), authController.refresh)
router.post('/logout', authenticate, authController.logout)

export default router
