import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { IRefreshTokenRepository } from '@employee/domain/IRefreshTokenRepository.js'
import type { TokenIssuer } from '@employee/application/TokenIssuer.js'
import type { LoginResponse } from '@employee/application/LoginUseCase.js'
import { InvalidRefreshTokenError } from '@errors/DomainErrors.js'

export interface RefreshTokenDTO {
    refreshToken: string
}

export class RefreshTokenUseCase {
    constructor(
        private readonly employeeRepository: IEmployeeRepository,
        private readonly authService: IAuthService,
        private readonly refreshTokenRepository: IRefreshTokenRepository,
        private readonly tokenIssuer: TokenIssuer
    ) {}

    async execute(dto: RefreshTokenDTO): Promise<LoginResponse> {
        if (typeof dto.refreshToken !== 'string' || dto.refreshToken === '') {
            throw new InvalidRefreshTokenError()
        }

        const stored = await this.refreshTokenRepository.findByHash(
            this.authService.hashRefreshToken(dto.refreshToken)
        )
        if (!stored) {
            throw new InvalidRefreshTokenError()
        }

        // Un token ya rotado o revocado que vuelve a usarse indica robo: se invalida toda la familia.
        if (stored.revokedAt) {
            await this.refreshTokenRepository.revokeFamily(stored.familyId)
            throw new InvalidRefreshTokenError()
        }

        if (stored.expiresAt.getTime() <= Date.now()) {
            await this.refreshTokenRepository.revoke(stored.id)
            throw new InvalidRefreshTokenError()
        }

        const employee = await this.employeeRepository.findById(stored.employeeId)
        if (!employee) {
            await this.refreshTokenRepository.revokeFamily(stored.familyId)
            throw new InvalidRefreshTokenError()
        }

        // El rol y el restaurante se leen de la BBDD: un cambio de rol se aplica al renovar.
        const issued = await this.tokenIssuer.issue({
            id: employee.id,
            role: employee.role,
            restaurantId: employee.restaurantId
        }, stored.familyId)
        await this.refreshTokenRepository.revoke(stored.id, issued.refreshTokenId)

        return {
            token: issued.token,
            refreshToken: issued.refreshToken,
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                role: employee.role,
                restaurantId: employee.restaurantId
            }
        }
    }
}
