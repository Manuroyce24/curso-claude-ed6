import { randomUUID } from 'crypto'
import { Employee } from '@employee/domain/Employee.js'
import { Email } from '@shared/domain/value-objects/Email.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import { validatePlainPassword } from '@employee/domain/value-objects/Password.js'
import { DuplicatedEmailError } from '@errors/DomainErrors.js'

export interface CreateEmployeeDTO {
    firstName: string
    lastName: string
    email: string
    passwordPlain: string
    role: string
    restaurantId: string | null
}

export class CreateEmployeeUseCase {
    constructor(
        private readonly employeeRepo: IEmployeeRepository,
        private readonly authService: IAuthService
    ) {}

    async execute(dto: CreateEmployeeDTO): Promise<Employee> {
        const password = validatePlainPassword(dto.passwordPlain)

        const existingEmployee = await this.employeeRepo.findByEmail(Email.normalize(dto.email))
        if (existingEmployee) {
            throw new DuplicatedEmailError()
        }

        const passwordHash = await this.authService.hashPassword(password)

        const employee = Employee.create({
            id: randomUUID(),
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            passwordHash,
            role: dto.role,
            restaurantId: dto.restaurantId
        })

        await this.employeeRepo.save(employee)
        return employee
    }
}
