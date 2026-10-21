import { Injectable, inject, signal, computed } from '@angular/core';
import { Order, OrderStatus } from '../models/order.model';
import { OrderService } from '../services/order.service';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '@resttek/web-shared';

@Injectable({ providedIn: 'root' })
export class OrderStore {
  private readonly orderService = inject(OrderService);
  private readonly authStore = inject(AuthStore);

  private readonly _orders = signal<Order[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly orders = this._orders.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadOrders(): Promise<void> {
    if (!this.authStore.isAuthenticated()) {
      this.stopPolling();
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      const orders = await firstValueFrom(this.orderService.getActiveOrders());
      this._orders.set(orders);
    } catch (err: unknown) {
      this._error.set(this.mensajeDeError(err, 'No se pudieron cargar los pedidos.'));
    } finally {
      this._loading.set(false);
    }
  }

  async updateItemStatus(orderId: string, itemId: string, status: OrderStatus): Promise<void> {
    try {
      await firstValueFrom(this.orderService.updateItemStatus(orderId, itemId, { status }));
      this._orders.update(orders => 
        orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              items: order.items.map(item => 
                item.id === itemId ? { ...item, status } : item
              )
            };
          }
          return order;
        })
      );
    } catch (err: unknown) {
      this._error.set(this.mensajeDeError(err, 'No se pudo actualizar el estado del plato.'));
    }
  }

  startPolling(): void {
    // Evita intervalos duplicados si se llama dos veces sin parar el anterior.
    this.stopPolling();
    this.loadOrders();
    this.pollingInterval = setInterval(() => {
      this.loadOrders();
    }, 30000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // No se muestra HttpErrorResponse.message: incluye la URL interna de la API.
  private mensajeDeError(err: unknown, porDefecto: string): string {
    const estado = (err as { status?: number })?.status;
    if (estado === 403) return 'No tienes permiso para realizar esta acción.';
    if (estado === 404) return 'El pedido ya no existe.';
    return porDefecto;
  }
}
