import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClientUseCase } from '@employee/application/RegisterClientUseCase.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import { TokenIssuer } from '@employee/application/TokenIssuer.js'
import { MockRefreshTokenRepository } from '@employee/application/mocks/MockDependencies.js'
import { DuplicatedEmailError, WeakPasswordError } from '@errors/DomainErrors.js'

describe('RegisterClientUseCase', () => {
    let mockEmployeeRepo: Partial<IEmployeeRepository>
    let mockAuthService: Partial<IAuthService>
    let useCase: RegisterClientUseCase
    let refreshRepo: MockRefreshTokenRepository

    beforeEach(() => {
        mockEmployeeRepo = {
            findByEmail: vi.fn(),
            save: vi.fn()
        }
        mockAuthService = {
            hashPassword: vi.fn().mockResolvedValue('hashedPassword'),
            generateToken: vi.fn().mockReturnValue('mockToken'),
            generateRefreshToken: vi.fn().mockReturnValue('mockRefresh'),
            hashRefreshToken: vi.fn().mockReturnValue('mockRefreshHash')
        }
        refreshRepo = new MockRefreshTokenRepository()
        useCase = new RegisterClientUseCase(
            mockEmployeeRepo as IEmployeeRepository,
            mockAuthService as IAuthService,
            new TokenIssuer(mockAuthService as IAuthService, refreshRepo)
        )
    })

    it('should register a new client and return token + employee data', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        const result = await useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password1234'
        })

        expect(result.token).toBe('mockToken')
        expect(result.refreshToken).toBe('mockRefresh')
        expect(refreshRepo.records[0]).toMatchObject({ tokenHash: 'mockRefreshHash' })
        expect(result.employee).toMatchObject({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'cliente',
            restaurantId: null
        })
        expect(mockEmployeeRepo.save).toHaveBeenCalledOnce()
    })

    it('should throw DuplicatedEmailError when email already exists', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue({
            id: 'existing-id',
            firstName: 'Existing',
            lastName: 'User',
            email: 'john@example.com',
            passwordHash: 'hash',
            role: 'cliente',
            restaurantId: null
        } as any)

        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password1234'
        })).rejects.toThrow(DuplicatedEmailError)

        expect(mockEmployeeRepo.save).not.toHaveBeenCalled()
    })

    it('should reject a weak password before touching the repository', async () => {
        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'corta'
        })).rejects.toThrow(WeakPasswordError)

        expect(mockEmployeeRepo.findByEmail).not.toHaveBeenCalled()
        expect(mockEmployeeRepo.save).not.toHaveBeenCalled()
    })

    it('should reject a missing password with a domain error instead of crashing', async () => {
        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
        } as any)).rejects.toThrow(WeakPasswordError)
    })

    it('should look up and store the email normalized', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        const result = await useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'John@Example.COM',
            password: 'password1234'
        })

        expect(mockEmployeeRepo.findByEmail).toHaveBeenCalledWith('john@example.com')
        expect(result.employee.email).toBe('john@example.com')
    })
})
