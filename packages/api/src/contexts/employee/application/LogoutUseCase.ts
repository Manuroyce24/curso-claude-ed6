import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { IRefreshTokenRepository } from '@employee/domain/IRefreshTokenRepository.js'

export interface LogoutDTO {
    refreshToken: string
    /** Empleado autenticado que cierra sesión: solo puede revocar sus propios tokens. */
    employeeId: string
}

export class LogoutUseCase {
    constructor(
        private readonly authService: IAuthService,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) {}

    async execute(dto: LogoutDTO): Promise<void> {
        if (typeof dto.refreshToken !== 'string' || dto.refreshToken === '') return

        const stored = await this.refreshTokenRepository.findByHash(
            this.authService.hashRefreshToken(dto.refreshToken)
        )
        if (!stored || stored.employeeId !== dto.employeeId) return

        await this.refreshTokenRepository.revokeFamily(stored.familyId)
    }
}
