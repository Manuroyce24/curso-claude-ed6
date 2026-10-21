import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from '@employee/infrastructure/http/auth.routes.js'
import employeeRoutes from '@employee/infrastructure/http/employee.routes.js'
import restaurantEmployeeRoutes from '@employee/infrastructure/http/restaurant-employee.routes.js'
import restaurantRoutes from '@routes/restaurant.routes.js'
import ingredientRoutes from '@routes/ingredient.routes.js'
import dishRoutes from '@routes/dish.routes.js'
import publicRestaurantRoutes from '@routes/restaurant.public.routes.js'
import publicDishRoutes from '@routes/dish.public.routes.js'
import orderRoutes from '@routes/order.routes.js'
import { errorHandler } from '@shared/infrastructure/http/errorHandler.js'

const ORIGENES_POR_DEFECTO = 'http://localhost:4200,http://localhost:4201,http://localhost:4202'
const origenesPermitidos = (process.env.CORS_ORIGINS ?? ORIGENES_POR_DEFECTO)
    .split(',')
    .map(origen => origen.trim())
    .filter(Boolean)

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: origenesPermitidos }))
app.use(express.json({ limit: '100kb' }))

app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/employees', employeeRoutes)
app.use('/api/v1/public/restaurants', publicRestaurantRoutes)
app.use('/api/v1/public/restaurants/:restaurantId/dishes', publicDishRoutes)
app.use('/api/v1/restaurants', restaurantRoutes)
app.use('/api/v1/restaurants/:restaurantId/ingredients', ingredientRoutes)
app.use('/api/v1/restaurants/:restaurantId/dishes', dishRoutes)
app.use('/api/v1/restaurants/:restaurantId/employees', restaurantEmployeeRoutes)

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
})

app.use(errorHandler)

export default app
