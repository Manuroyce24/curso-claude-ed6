import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    number: number
    description: string | null
    capacity: number
    status: string
    restaurantId: string
    createdAt: string
    updatedAt: string
}

const COLUMNS = 'id, number, description, capacity, status, restaurant_id as restaurantId, created_at as createdAt, updated_at as updatedAt'

export interface TableRepository {
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findByIdInRestaurant(id: string, restaurantId: string): Promise<Table | null>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `SELECT ${COLUMNS} FROM restaurant_tables WHERE restaurant_id = ? ORDER BY number`,
            [restaurantId]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async findByIdInRestaurant(id: string, restaurantId: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `SELECT ${COLUMNS} FROM restaurant_tables WHERE id = ? AND restaurant_id = ?`,
            [id, restaurantId]
        )
        return row ? this.mapToTable(row) : null
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `SELECT ${COLUMNS} FROM restaurant_tables WHERE restaurant_id = ? AND number = ?`,
            [restaurantId, number]
        )
        return row ? this.mapToTable(row) : null
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            restaurantId: row.restaurantId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
