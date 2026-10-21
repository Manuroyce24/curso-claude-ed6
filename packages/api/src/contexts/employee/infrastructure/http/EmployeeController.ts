import type { Request, Response, NextFunction } from 'express'
import type { CreateEmployeeUseCase } from '@employee/application/CreateEmployeeUseCase.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import { EmployeeNotFoundError } from '@errors/DomainErrors.js'

const MAX_LIMIT = 100

export class EmployeeController {
    constructor(
        private createEmployeeUseCase: CreateEmployeeUseCase,
        private employeeRepository: IEmployeeRepository
    ) {}

    createEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { firstName, lastName, email, password, role, restaurantId } = req.body
            const employee = await this.createEmployeeUseCase.execute({
                firstName,
                lastName,
                email,
                passwordPlain: password,
                role,
                restaurantId: restaurantId ?? null
            })
            res.status(201).json({
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                role: employee.role,
                restaurantId: employee.restaurantId
            })
        } catch (error) {
            next(error)
        }
    }

    listEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const solicitado = parseInt(req.query.limit as string)
            const limit = solicitado > 0 ? Math.min(solicitado, MAX_LIMIT) : 10
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
            const role = req.query.role as string

            const employees = await this.employeeRepository.findAll(limit, offset, role)
            res.status(200).json(employees.map(e => ({
                id: e.id,
                firstName: e.firstName,
                lastName: e.lastName,
                email: e.email,
                role: e.role,
                restaurantId: e.restaurantId
            })))
        } catch (error) {
            next(error)
        }
    }

    getEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const employee = await this.employeeRepository.findById(req.params.id as string)
            if (!employee) {
                throw new EmployeeNotFoundError()
            }
            res.status(200).json({
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                role: employee.role,
                restaurantId: employee.restaurantId
            })
        } catch (error) {
            next(error)
        }
    }

    listEmployeesByRestaurant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const restaurantId = req.params['restaurantId'] as string
            const employees = await this.employeeRepository.findByRestaurant(restaurantId)
            res.status(200).json(employees.map(e => ({
                id: e.id,
                firstName: e.firstName,
                lastName: e.lastName,
                email: e.email,
                role: e.role,
                restaurantId: e.restaurantId
            })))
        } catch (error) {
            next(error)
        }
    }
}
