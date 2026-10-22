import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidTableDescriptionError,
    DuplicatedTableNumberError
} from '@errors/DomainErrors.js'

const MAX_CAPACIDAD = 50
const MAX_DESCRIPCION = 200

export interface TableInput {
    number: number
    description?: string | null
    capacity: number
    status?: string
}

const esEnteroEntre = (valor: unknown, min: number, max: number): valor is number =>
    typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(restaurantId: string, input: TableInput): Promise<Table> {
        const datos = this.validar(input, 'libre')
        await this.comprobarNumeroLibre(restaurantId, datos.number)

        const now = new Date().toISOString()
        const table: Table = { id: randomUUID(), ...datos, restaurantId, createdAt: now, updatedAt: now }
        await this.tableRepository.save(table)
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    private async comprobarNumeroLibre(restaurantId: string, number: number, idActual?: string): Promise<void> {
        const existente = await this.tableRepository.findByNumber(restaurantId, number)
        if (existente && existente.id !== idActual) {
            throw new DuplicatedTableNumberError()
        }
    }

    private validar(input: TableInput, estadoPorDefecto: TableStatusType) {
        if (!esEnteroEntre(input.number, 1, Number.MAX_SAFE_INTEGER)) {
            throw new InvalidTableNumberError()
        }
        if (!esEnteroEntre(input.capacity, 1, MAX_CAPACIDAD)) {
            throw new InvalidCapacityError()
        }
        const description = input.description ?? null
        if (description !== null && (typeof description !== 'string' || description.length > MAX_DESCRIPCION)) {
            throw new InvalidTableDescriptionError()
        }
        return {
            number: input.number,
            description: description?.trim() || null,
            capacity: input.capacity,
            status: input.status === undefined ? estadoPorDefecto : normalizeTableStatus(input.status)
        }
    }
}
