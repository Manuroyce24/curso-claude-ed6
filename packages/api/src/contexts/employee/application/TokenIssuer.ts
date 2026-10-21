import { randomUUID } from 'crypto'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { IRefreshTokenRepository } from '@employee/domain/IRefreshTokenRepository.js'
import { REFRESH_TOKEN_TTL_SECONDS } from '@config/env.js'

export interface SessionSubject {
    id: string
    role: string
    restaurantId: string | null
}

export interface IssuedTokens {
    token: string
    refreshToken: string
    /** id del registro de refresh creado (sirve para enlazar la rotación). */
    refreshTokenId: string
}

/** Emite el par access JWT + refresh token y registra el hash del refresh. */
export class TokenIssuer {
    constructor(
        private readonly authService: IAuthService,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) {}

    async issue(subject: SessionSubject, familyId: string = randomUUID()): Promise<IssuedTokens> {
        const token = this.authService.generateToken({
            id: subject.id,
            role: subject.role,
            restaurantId: subject.restaurantId
        })

        const refreshToken = this.authService.generateRefreshToken()
        const now = new Date()
        const refreshTokenId = randomUUID()
        await this.refreshTokenRepository.save({
            id: refreshTokenId,
            employeeId: subject.id,
            familyId,
            tokenHash: this.authService.hashRefreshToken(refreshToken),
            expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
            revokedAt: null,
            replacedBy: null,
            createdAt: now
        })

        return { token, refreshToken, refreshTokenId }
    }
}
