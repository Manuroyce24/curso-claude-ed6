import jwt from 'jsonwebtoken'
import { dbConfig } from '@config/database.js'

export const JWT_SECRET_TEST = process.env.JWT_SECRET ?? 'super-secret-resttek-key'

export interface UsuarioTest {
    id: string
    role: string
    restaurantId?: string | null
}

export const tokenDe = (usuario: UsuarioTest): string =>
    jwt.sign(usuario, JWT_SECRET_TEST, { expiresIn: '1h' })

export const bearer = (usuario: UsuarioTest): [string, string] =>
    ['Authorization', `Bearer ${tokenDe(usuario)}`]

const ahora = new Date().toISOString()

export const crearRestaurante = (id: string) =>
    dbConfig.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, `Restaurante ${id}`, 'Calle 1', `${id}@resttek.com`, '+34600000000', 'Ana', 'Dueña', ahora, ahora]
    )

export const crearPlato = (id: string, restaurantId: string) =>
    dbConfig.run(
        'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, 1, ?, ?, ?)',
        [id, `Plato ${id}`, 10, 'principal', restaurantId, ahora, ahora]
    )

export const crearPedido = async (id: string, restaurantId: string, clientId: string | null, dishId: string, itemId: string) => {
    await dbConfig.run(
        'INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, NULL, ?, ?)',
        [id, restaurantId, clientId, ahora]
    )
    await dbConfig.run(
        'INSERT INTO order_items (id, order_id, dish_id, quantity, notes, status) VALUES (?, ?, ?, 1, NULL, ?)',
        [itemId, id, dishId, 'pendiente']
    )
}
