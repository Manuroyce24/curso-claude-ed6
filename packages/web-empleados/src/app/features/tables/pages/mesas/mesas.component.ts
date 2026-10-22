import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { TableStore } from '../../store/table.store';
import { OrderStore } from '../../../orders/store/order.store';
import { TABLE_STATUSES, TableStatus } from '../../models/table.model';
import { Order } from '../../../orders/models/order.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  readonly tableStore = inject(TableStore);
  readonly orderStore = inject(OrderStore);
  readonly statuses = TABLE_STATUSES;

  // Pedidos activos agrupados por mesa (GET /orders/active ya trae el tableId).
  readonly ordersByTable = computed(() => {
    const porMesa = new Map<string, Order[]>();
    for (const order of this.orderStore.orders()) {
      if (!order.tableId) continue;
      porMesa.set(order.tableId, [...(porMesa.get(order.tableId) ?? []), order]);
    }
    return porMesa;
  });

  ngOnInit(): void {
    this.tableStore.startPolling();
    this.orderStore.startPolling();
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  onChangeStatus(id: string, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    this.tableStore.changeStatus(id, status);
  }

  ordersOf(tableId: string): Order[] {
    return this.ordersByTable().get(tableId) ?? [];
  }

  getItemStatusClass(status: string): string {
    return `badge badge-${status}`;
  }

  getStatusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = {
      libre: 'Libre',
      ocupada: 'Ocupada',
      reservada: 'Reservada'
    };
    return labels[status] ?? status;
  }
}
