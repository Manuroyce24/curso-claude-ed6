import { Injectable, signal, computed } from '@angular/core'

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
  restaurantId: string
  ingredients: { ingredientId: string; quantity: number }[]
}

export interface CartItem {
  dish: Dish
  quantity: number
  notes: string
}

export interface SelectedTable {
  restaurantId: string
  tableId: string
  tableNumber: number
}

const CLAVE_MESA = 'resttek.mesa'

// La mesa elegida queda ocupada en la API: se guarda en sessionStorage para no perderla al recargar.
function leerMesaGuardada(): SelectedTable | null {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE_MESA) ?? 'null')
    return guardada && typeof guardada.restaurantId === 'string' && typeof guardada.tableId === 'string'
      && typeof guardada.tableNumber === 'number' ? guardada : null
  } catch {
    return null
  }
}

function guardarMesa(mesa: SelectedTable | null): void {
  try {
    if (mesa) {
      sessionStorage.setItem(CLAVE_MESA, JSON.stringify(mesa))
    } else {
      sessionStorage.removeItem(CLAVE_MESA)
    }
  } catch {
    // Sin almacenamiento disponible (modo privado, cookies bloqueadas…): la mesa vive solo en memoria.
  }
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([])
  private readonly _restaurantId = signal<string | null>(null)
  private readonly _table = signal<SelectedTable | null>(leerMesaGuardada())

  readonly items = this._items.asReadonly()
  readonly restaurantId = this._restaurantId.asReadonly()
  readonly table = this._table.asReadonly()

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  )

  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0)
  )

  addItem(dish: Dish, quantity: number = 1, notes: string = ''): void {
    if (this._restaurantId() && this._restaurantId() !== dish.restaurantId) {
      this._items.set([])
    }
    this._restaurantId.set(dish.restaurantId)

    const existingIndex = this._items().findIndex(
      item => item.dish.id === dish.id && item.notes === notes
    )

    if (existingIndex >= 0) {
      const items = [...this._items()]
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity
      }
      this._items.set(items)
    } else {
      this._items.update(items => [...items, { dish, quantity, notes }])
    }
  }

  removeItem(dishId: string): void {
    const items = this._items().filter(item => item.dish.id !== dishId)
    this._items.set(items)
    if (items.length === 0) {
      this._restaurantId.set(null)
    }
  }

  updateQuantity(dishId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(dishId)
      return
    }
    const items = this._items().map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    )
    this._items.set(items)
  }

  // Vacía solo los platos: la mesa se conserva para poder hacer más pedidos desde ella.
  clear(): void {
    this._items.set([])
    this._restaurantId.set(null)
  }

  setTable(restaurantId: string, tableId: string, tableNumber: number): void {
    const mesa = { restaurantId, tableId, tableNumber }
    this._table.set(mesa)
    guardarMesa(mesa)
  }

  tableFor(restaurantId: string): SelectedTable | null {
    const mesa = this._table()
    return mesa?.restaurantId === restaurantId ? mesa : null
  }

  clearTable(): void {
    this._table.set(null)
    guardarMesa(null)
  }
}
