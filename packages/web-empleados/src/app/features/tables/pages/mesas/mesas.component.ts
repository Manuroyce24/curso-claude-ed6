import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { TableStore } from '../../store/table.store';
import { OrderStore } from '../../../orders/store/order.store';
import { TABLE_STATUSES, TableStatus } from '../../models/table.model';

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

  getStatusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = {
      libre: 'Libre',
      ocupada: 'Ocupada',
      reservada: 'Reservada'
    };
    return labels[status] ?? status;
  }
}
