import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshTokenUseCase } from '@employee/application/RefreshTokenUseCase.js'
import { TokenIssuer } from '@employee/application/TokenIssuer.js'
import { LoginUseCase } from '@employee/application/LoginUseCase.js'
import { MockEmployeeRepository, MockAuthService, MockRefreshTokenRepository } from '@employee/application/mocks/MockDependencies.js'
import { Employee } from '@employee/domain/Employee.js'
import { InvalidRefreshTokenError } from '@errors/DomainErrors.js'

describe('RefreshTokenUseCase', () => {
    let employeeRepo: MockEmployeeRepository
    let authService: MockAuthService
    let refreshRepo: MockRefreshTokenRepository
    let useCase: RefreshTokenUseCase
    let refreshInicial: string

    beforeEach(async () => {
        employeeRepo = new MockEmployeeRepository()
        authService = new MockAuthService()
        refreshRepo = new MockRefreshTokenRepository()
        const issuer = new TokenIssuer(authService, refreshRepo)
        useCase = new RefreshTokenUseCase(employeeRepo, authService, refreshRepo, issuer)

        await employeeRepo.save(Employee.create({
            id: 'emp-1', firstName: 'Ana', lastName: 'Gil', email: 'ana@resttek.com',
            passwordHash: 'hashed_password123', role: 'cocinero', restaurantId: 'r1'
        }))
        const login = new LoginUseCase(employeeRepo, authService, issuer)
        refreshInicial = (await login.execute({ email: 'ana@resttek.com', passwordRaw: 'password123' })).refreshToken
    })

    it('rota el token: devuelve un par nuevo y revoca el anterior enlazándolo', async () => {
        const res = await useCase.execute({ refreshToken: refreshInicial })

        expect(res.token).toContain('emp-1')
        expect(res.refreshToken).not.toBe(refreshInicial)
        expect(refreshRepo.records).toHaveLength(2)
        const [viejo, nuevo] = refreshRepo.records
        expect(viejo!.revokedAt).not.toBeNull()
        expect(viejo!.replacedBy).toBe(nuevo!.id)
        expect(nuevo!.familyId).toBe(viejo!.familyId)
        expect(nuevo!.revokedAt).toBeNull()
    })

    it('el token nuevo puede volver a rotarse', async () => {
        const primero = await useCase.execute({ refreshToken: refreshInicial })
        const segundo = await useCase.execute({ refreshToken: primero.refreshToken })
        expect(segundo.refreshToken).not.toBe(primero.refreshToken)
    })

    it('rechaza la reutilización de un token rotado y revoca toda la familia', async () => {
        const rotado = await useCase.execute({ refreshToken: refreshInicial })

        await expect(useCase.execute({ refreshToken: refreshInicial })).rejects.toThrow(InvalidRefreshTokenError)

        expect(refreshRepo.records.every(r => r.revokedAt !== null)).toBe(true)
        await expect(useCase.execute({ refreshToken: rotado.refreshToken })).rejects.toThrow(InvalidRefreshTokenError)
    })

    it('rechaza un token desconocido', async () => {
        await expect(useCase.execute({ refreshToken: 'inventado' })).rejects.toThrow(InvalidRefreshTokenError)
    })

    it.each([undefined, null, 123, ''])('rechaza un valor que no es un token (%s)', async (valor) => {
        await expect(useCase.execute({ refreshToken: valor as any })).rejects.toThrow(InvalidRefreshTokenError)
    })

    it('rechaza un token caducado', async () => {
        refreshRepo.records[0]!.expiresAt = new Date(Date.now() - 1000)
        await expect(useCase.execute({ refreshToken: refreshInicial })).rejects.toThrow(InvalidRefreshTokenError)
    })

    it('rechaza el token si el empleado ya no existe', async () => {
        await employeeRepo.delete('emp-1')
        await expect(useCase.execute({ refreshToken: refreshInicial })).rejects.toThrow(InvalidRefreshTokenError)
    })

    it('usa el rol actual del empleado, no el del token anterior', async () => {
        await employeeRepo.save(Employee.create({
            id: 'emp-1', firstName: 'Ana', lastName: 'Gil', email: 'ana@resttek.com',
            passwordHash: 'hashed_password123', role: 'manager', restaurantId: 'r1'
        }))
        const res = await useCase.execute({ refreshToken: refreshInicial })
        expect(res.employee.role).toBe('manager')
    })
})
