import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { TABLE_STATUSES, type CreateTableDto, type TableStatus } from '../../models/table.model'

const MAX_CAPACIDAD = 50

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  readonly statuses = TABLE_STATUSES
  readonly maxCapacity = MAX_CAPACIDAD

  form: CreateTableDto = {
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre'
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  getStatusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = {
      libre: 'Libre',
      ocupada: 'Ocupada',
      reservada: 'Reservada'
    }
    return labels[status] ?? status
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = {
        number: table.number,
        description: table.description,
        capacity: table.capacity,
        status: table.status
      }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  private validar(): string | null {
    if (!Number.isInteger(this.form.number) || this.form.number < 1) {
      return 'El número de mesa debe ser un entero mayor que 0.'
    }
    if (!Number.isInteger(this.form.capacity) || this.form.capacity < 1 || this.form.capacity > MAX_CAPACIDAD) {
      return `La capacidad debe ser un entero entre 1 y ${MAX_CAPACIDAD}.`
    }
    return null
  }

  async onSubmit(): Promise<void> {
    const invalido = this.validar()
    this.error.set(invalido)
    if (invalido) return

    this.loading.set(true)
    const dto: CreateTableDto = { ...this.form, description: this.form.description?.trim() || null }
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err: unknown) {
      const estado = (err as { status?: number })?.status
      this.error.set(estado === 409
        ? `Ya existe una mesa con el número ${this.form.number} en este restaurante.`
        : 'Error al guardar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }
}
