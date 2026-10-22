import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '@resttek/web-shared';
import { Table, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);
  private readonly authStore = inject(AuthStore);

  private readonly _tables = signal<Table[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // El restaurante es el del empleado autenticado: la API rechaza cualquier otro.
  private get restaurantId(): string | null {
    return this.authStore.user()?.restaurantId ?? null;
  }

  async loadTables(): Promise<void> {
    const restaurantId = this.restaurantId;
    if (!this.authStore.isAuthenticated() || !restaurantId) {
      this.stopPolling();
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      this._tables.set(await firstValueFrom(this.tableService.getAll(restaurantId)));
    } catch (err: unknown) {
      this._error.set(this.mensajeDeError(err, 'No se pudieron cargar las mesas.'));
    } finally {
      this._loading.set(false);
    }
  }

  async changeStatus(id: string, status: TableStatus): Promise<void> {
    const restaurantId = this.restaurantId;
    if (!restaurantId) return;
    try {
      const updated = await firstValueFrom(this.tableService.changeStatus(restaurantId, id, { status }));
      this._tables.update(tables => tables.map(t => t.id === id ? updated : t));
    } catch (err: unknown) {
      this._error.set(this.mensajeDeError(err, 'No se pudo cambiar el estado de la mesa.'));
    }
  }

  startPolling(): void {
    this.stopPolling();
    this.loadTables();
    this.pollingInterval = setInterval(() => {
      this.loadTables();
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
    if (estado === 404) return 'La mesa ya no existe.';
    return porDefecto;
  }
}
