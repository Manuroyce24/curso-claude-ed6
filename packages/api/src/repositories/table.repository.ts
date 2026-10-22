import { Database } from '@config/database.js'
import type { Table, TableStatusType } from '@models/table.model.js'
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
    save(table: Table): Promise<void>
    updateStatus(id: string, status: TableStatusType, updatedAt: string): Promise<void>
    delete(id: string): Promise<void>
    findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]>
    occupyIfFree(id: string, restaurantId: string, updatedAt: string): Promise<boolean>
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

    async save(table: Table): Promise<void> {
        await this.db.run(
            `INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                number = excluded.number,
                description = excluded.description,
                capacity = excluded.capacity,
                status = excluded.status,
                updated_at = excluded.updated_at`,
            [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
        )
    }

    async updateStatus(id: string, status: TableStatusType, updatedAt: string): Promise<void> {
        await this.db.run('UPDATE restaurant_tables SET status = ?, updated_at = ? WHERE id = ?', [status, updatedAt, id])
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM restaurant_tables WHERE id = ?', [id])
    }

    async findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `SELECT ${COLUMNS} FROM restaurant_tables
             WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ?
             ORDER BY capacity, number`,
            [restaurantId, minCapacity]
        )
        return rows.map(row => this.mapToTable(row))
    }

    // Un único UPDATE condicionado al estado: si dos clientes eligen la misma mesa, solo uno la ocupa.
    async occupyIfFree(id: string, restaurantId: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            `UPDATE restaurant_tables SET status = 'ocupada', updated_at = ?
             WHERE id = ? AND restaurant_id = ? AND status = 'libre'`,
            [updatedAt, id, restaurantId]
        )
        return result.changes === 1
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
