import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@errors/AppError.js'

const NOT_FOUND_ERRORS = [
    'EmployeeNotFoundError',
    'RestaurantNotFoundError',
    'IngredientNotFoundError',
    'DishNotFoundError',
    'OrderNotFoundError'
]

const FORBIDDEN_ERRORS = [
    'ForbiddenError'
]

const UNAUTHORIZED_ERRORS = [
    'InvalidCredentialsError',
    'InvalidRefreshTokenError'
]

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
        let statusCode = 400

        if (NOT_FOUND_ERRORS.includes(err.name)) {
            statusCode = 404
        } else if (FORBIDDEN_ERRORS.includes(err.name)) {
            statusCode = 403
        } else if (UNAUTHORIZED_ERRORS.includes(err.name)) {
            statusCode = 401
        }

        res.status(statusCode).json({
            error: err.name,
            message: err.message
        })
        return
    }

    // Errores de body-parser (JSON malformado, cuerpo demasiado grande...): llevan status 4xx y type.
    if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500 && typeof err?.type === 'string') {
        const message = err.status === 413 ? 'Request body is too large' : 'Malformed request body'
        res.status(err.status).json({ error: 'BadRequest', message })
        return
    }

    res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' })
}
