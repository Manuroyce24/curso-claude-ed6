import type { Database } from '@config/database.js'

// Mesa en la que se sienta el pedido de ejemplo del seed: empieza ocupada.
export const MESA_PEDIDO_EJEMPLO = 'mesa-rest-1-5'

const MESAS: { restaurantId: string, number: number, capacity: number, description: string | null }[] = [
    { restaurantId: 'rest-1', number: 1, capacity: 2, description: 'Junto a la ventana' },
    { restaurantId: 'rest-1', number: 2, capacity: 2, description: 'Junto a la ventana' },
    { restaurantId: 'rest-1', number: 3, capacity: 4, description: null },
    { restaurantId: 'rest-1', number: 4, capacity: 4, description: null },
    { restaurantId: 'rest-1', number: 5, capacity: 6, description: 'Salón principal' },
    { restaurantId: 'rest-1', number: 6, capacity: 8, description: 'Reservado para grupos' },
    { restaurantId: 'rest-2', number: 1, capacity: 2, description: 'Terraza' },
    { restaurantId: 'rest-2', number: 2, capacity: 4, description: 'Terraza' },
    { restaurantId: 'rest-2', number: 3, capacity: 4, description: null },
    { restaurantId: 'rest-2', number: 4, capacity: 6, description: null }
]

export const seedTables = async (db: Database): Promise<void> => {
    const ahora = new Date().toISOString()
    for (const mesa of MESAS) {
        const id = `mesa-${mesa.restaurantId}-${mesa.number}`
        const status = id === MESA_PEDIDO_EJEMPLO ? 'ocupada' : 'libre'
        await db.run(
            `INSERT OR IGNORE INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, mesa.restaurantId, mesa.number, mesa.description, mesa.capacity, status, ahora, ahora]
        )
    }
}
