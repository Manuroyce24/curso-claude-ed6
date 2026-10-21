import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { Employee } from '@employee/domain/Employee.js'
import type { IRefreshTokenRepository, RefreshTokenRecord } from '@employee/domain/IRefreshTokenRepository.js'

export class MockEmployeeRepository implements IEmployeeRepository {
    private employees: Map<string, Employee> = new Map()

    async findById(id: string): Promise<Employee | null> {
        return this.employees.get(id) || null
    }

    async findByEmail(email: string): Promise<Employee | null> {
        for (const employee of this.employees.values()) {
            if (employee.email === email) {
                return employee
            }
        }
        return null
    }

    async findAll(limit: number = 10, offset: number = 0, role?: string): Promise<Employee[]> {
        let allEmployees = Array.from(this.employees.values())
        if (role) {
            allEmployees = allEmployees.filter(emp => emp.role === role)
        }
        return allEmployees.slice(offset, offset + limit)
    }

    async findByRestaurant(restaurantId: string): Promise<Employee[]> {
        return Array.from(this.employees.values()).filter(emp => emp.restaurantId === restaurantId)
    }

    async save(employee: Employee): Promise<void> {
        this.employees.set(employee.id, employee)
    }

    async delete(id: string): Promise<void> {
        this.employees.delete(id)
    }
}

export class MockAuthService implements IAuthService {
    async hashPassword(password: string): Promise<string> {
        return `hashed_${password}`
    }

    async comparePasswords(provided: string, stored: string): Promise<boolean> {
        return `hashed_${provided}` === stored
    }

    generateToken(payload: any): string {
        return `fake-jwt-token-for-${payload.id}`
    }

    private contador = 0

    generateRefreshToken(): string {
        this.contador += 1
        return `refresh-token-${this.contador}`
    }

    hashRefreshToken(token: string): string {
        return `hash(${token})`
    }
}

export class MockRefreshTokenRepository implements IRefreshTokenRepository {
    records: RefreshTokenRecord[] = []

    async save(record: RefreshTokenRecord): Promise<void> {
        this.records.push({ ...record })
    }

    async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
        return this.records.find(r => r.tokenHash === tokenHash) ?? null
    }

    async revoke(id: string, replacedBy: string | null = null): Promise<void> {
        const r = this.records.find(x => x.id === id)
        if (r && !r.revokedAt) {
            r.revokedAt = new Date()
            r.replacedBy = replacedBy
        }
    }

    async revokeFamily(familyId: string): Promise<void> {
        this.records.filter(r => r.familyId === familyId && !r.revokedAt).forEach(r => { r.revokedAt = new Date() })
    }

    async revokeAllByEmployee(employeeId: string): Promise<void> {
        this.records.filter(r => r.employeeId === employeeId && !r.revokedAt).forEach(r => { r.revokedAt = new Date() })
    }
}
