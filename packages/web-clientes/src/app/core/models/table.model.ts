export interface Table {
  id: string
  number: number
  description: string | null
  capacity: number
  status: 'libre' | 'ocupada' | 'reservada'
  restaurantId: string
  createdAt: string
  updatedAt: string
}
