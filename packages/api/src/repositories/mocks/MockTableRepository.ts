import type { TableRepository } from '@repositories/table.repository.js'
import type { Table, TableStatusType } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    tables: Table[] = []

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
            .map(t => ({ ...t }))
    }

    async findByIdInRestaurant(id: string, restaurantId: string): Promise<Table | null> {
        const table = this.tables.find(t => t.id === id && t.restaurantId === restaurantId)
        return table ? { ...table } : null
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        const table = this.tables.find(t => t.restaurantId === restaurantId && t.number === number)
        return table ? { ...table } : null
    }

    async save(table: Table): Promise<void> {
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) {
            this.tables[index] = { ...table }
        } else {
            this.tables.push({ ...table })
        }
    }

    async updateStatus(id: string, status: TableStatusType, updatedAt: string): Promise<void> {
        const table = this.tables.find(t => t.id === id)
        if (table) {
            table.status = status
            table.updatedAt = updatedAt
        }
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }

    async findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId && t.status === 'libre' && t.capacity >= minCapacity)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
            .map(t => ({ ...t }))
    }

    async occupyIfFree(id: string, restaurantId: string, updatedAt: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id && t.restaurantId === restaurantId && t.status === 'libre')
        if (!table) return false
        table.status = 'ocupada'
        table.updatedAt = updatedAt
        return true
    }
}
