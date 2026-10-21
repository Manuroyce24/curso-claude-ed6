import type { DishRepository } from '@repositories/dish.repository.js'
import type { Dish } from '@models/dish.model.js'

export class MockDishRepository implements DishRepository {
    dishes: Dish[] = []

    async findById(id: string): Promise<Dish | null> {
        return this.dishes.find(d => d.id === id) || null
    }

    async findByIdInRestaurant(id: string, restaurantId: string): Promise<Dish | null> {
        return this.dishes.find(d => d.id === id && d.restaurantId === restaurantId) || null
    }

    async findByRestaurantId(restaurantId: string): Promise<Dish[]> {
        return this.dishes.filter(d => d.restaurantId === restaurantId)
    }

    async save(dish: Dish): Promise<void> {
        this.dishes = this.dishes.filter(d => d.id !== dish.id)
        this.dishes.push(dish)
    }

    async delete(id: string): Promise<void> {
        this.dishes = this.dishes.filter(d => d.id !== id)
    }
}
