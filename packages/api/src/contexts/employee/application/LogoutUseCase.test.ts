import { describe, it, expect, beforeEach } from 'vitest'
import { LogoutUseCase } from '@employee/application/LogoutUseCase.js'
import { MockAuthService, MockRefreshTokenRepository } from '@employee/application/mocks/MockDependencies.js'
import { TokenIssuer } from '@employee/application/TokenIssuer.js'

describe('LogoutUseCase', () => {
    let authService: MockAuthService
    let refreshRepo: MockRefreshTokenRepository
    let useCase: LogoutUseCase
    let refreshToken: string

    beforeEach(async () => {
        authService = new MockAuthService()
        refreshRepo = new MockRefreshTokenRepository()
        useCase = new LogoutUseCase(authService, refreshRepo)
        refreshToken = (await new TokenIssuer(authService, refreshRepo)
            .issue({ id: 'emp-1', role: 'cocinero', restaurantId: 'r1' })).refreshToken
    })

    it('revoca la familia del refresh recibido', async () => {
        await useCase.execute({ refreshToken, employeeId: 'emp-1' })
        expect(refreshRepo.records.every(r => r.revokedAt !== null)).toBe(true)
    })

    it('es idempotente', async () => {
        await useCase.execute({ refreshToken, employeeId: 'emp-1' })
        await expect(useCase.execute({ refreshToken, employeeId: 'emp-1' })).resolves.toBeUndefined()
    })

    it('ignora tokens desconocidos o inválidos sin fallar', async () => {
        await expect(useCase.execute({ refreshToken: 'nope', employeeId: 'emp-1' })).resolves.toBeUndefined()
        await expect(useCase.execute({ refreshToken: undefined as any, employeeId: 'emp-1' })).resolves.toBeUndefined()
    })

    it('no revoca el token de otro empleado', async () => {
        await useCase.execute({ refreshToken, employeeId: 'emp-2' })
        expect(refreshRepo.records[0]!.revokedAt).toBeNull()
    })
})
