import { AuthController } from '@employee/infrastructure/http/AuthController.js'
import { EmployeeController } from '@employee/infrastructure/http/EmployeeController.js'
import { dbConfig } from '@config/database.js'
import { SqliteEmployeeRepository } from '@employee/infrastructure/SqliteEmployeeRepository.js'
import { BcryptAuthService } from '@employee/infrastructure/BcryptAuthService.js'
import { SqliteRefreshTokenRepository } from '@employee/infrastructure/SqliteRefreshTokenRepository.js'
import { TokenIssuer } from '@employee/application/TokenIssuer.js'
import { LoginUseCase } from '@employee/application/LoginUseCase.js'
import { CreateEmployeeUseCase } from '@employee/application/CreateEmployeeUseCase.js'
import { RegisterClientUseCase } from '@employee/application/RegisterClientUseCase.js'

const employeeRepository = new SqliteEmployeeRepository(dbConfig)
const authService = new BcryptAuthService()
const refreshTokenRepository = new SqliteRefreshTokenRepository(dbConfig)
const tokenIssuer = new TokenIssuer(authService, refreshTokenRepository)
const loginUseCase = new LoginUseCase(employeeRepository, authService, tokenIssuer)
const createEmployeeUseCase = new CreateEmployeeUseCase(employeeRepository, authService)
const registerClientUseCase = new RegisterClientUseCase(employeeRepository, authService, tokenIssuer)

export const authController = new AuthController(loginUseCase, registerClientUseCase)
export const employeeController = new EmployeeController(
    createEmployeeUseCase,
    employeeRepository
)
