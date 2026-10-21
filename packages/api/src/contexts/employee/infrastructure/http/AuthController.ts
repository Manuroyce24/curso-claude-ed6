import type { Request, Response, NextFunction } from 'express'
import type { LoginUseCase } from '@employee/application/LoginUseCase.js'
import type { RegisterClientUseCase } from '@employee/application/RegisterClientUseCase.js'
import type { RefreshTokenUseCase } from '@employee/application/RefreshTokenUseCase.js'
import type { LogoutUseCase } from '@employee/application/LogoutUseCase.js'
import type { AuthRequest } from '@shared/infrastructure/http/middlewares.js'
import { ForbiddenError } from '@errors/DomainErrors.js'

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerClientUseCase?: RegisterClientUseCase,
        private refreshTokenUseCase?: RefreshTokenUseCase,
        private logoutUseCase?: LogoutUseCase
    ) {}

    login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.loginUseCase.execute({
                email: req.body.email,
                passwordRaw: req.body.password
            })
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }

    register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!this.registerClientUseCase) {
                throw new Error('RegisterClientUseCase not configured')
            }
            const result = await this.registerClientUseCase.execute({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: req.body.password
            })
            res.status(201).json(result)
        } catch (error) {
            next(error)
        }
    }

    refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!this.refreshTokenUseCase) {
                throw new Error('RefreshTokenUseCase not configured')
            }
            const result = await this.refreshTokenUseCase.execute({ refreshToken: req.body?.refreshToken })
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }

    logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!this.logoutUseCase) {
                throw new Error('LogoutUseCase not configured')
            }
            if (!req.user) throw new ForbiddenError()
            await this.logoutUseCase.execute({ refreshToken: req.body?.refreshToken, employeeId: req.user.id })
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
