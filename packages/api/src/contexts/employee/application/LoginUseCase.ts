import { Email } from '@shared/domain/value-objects/Email.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { TokenIssuer } from '@employee/application/TokenIssuer.js'
import { InvalidCredentialsError } from '@errors/DomainErrors.js'

// Hash bcrypt (cost 10) de una contraseña aleatoria. Se compara cuando el email no existe
// para que el tiempo de respuesta no revele qué cuentas están registradas.
const HASH_FICTICIO = '$2b$10$PvjYZRr38OuOOyYCNNvmnemN5dgCLXoN9bJb.mrgbwAhTHdSiqP0O'

export interface LoginDTO {
    email: string
    passwordRaw: string
}

export interface LoginResponse {
    token: string
    refreshToken: string
    employee: {
        id: string
        firstName: string
        lastName: string
        email: string
        role: string
        restaurantId: string | null
    }
}

export class LoginUseCase {
    constructor(
        private employeeRepository: IEmployeeRepository,
        private authService: IAuthService,
        private tokenIssuer: TokenIssuer
    ) {}

    async execute(dto: LoginDTO): Promise<LoginResponse> {
        const employee = await this.employeeRepository.findByEmail(Email.normalize(dto.email))

        // bcrypt lanza una excepción (500) si recibe algo que no sea un string.
        const candidata = typeof dto.passwordRaw === 'string' ? dto.passwordRaw : ''
        const isValid = await this.authService.comparePasswords(
            candidata,
            employee?.passwordHash ?? HASH_FICTICIO
        )
        if (!employee || !isValid) {
            throw new InvalidCredentialsError()
        }

        const { token, refreshToken } = await this.tokenIssuer.issue({
            id: employee.id,
            role: employee.role,
            restaurantId: employee.restaurantId
        })

        return {
            token,
            refreshToken,
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
