import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Restaurant } from '../../core/models/restaurant.model'
import { Table } from '../../core/models/table.model'

const MAX_PERSONAS = 50

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>{{ restaurant()?.name || 'Cargando...' }}</h1>
        <p>Indica cuántas personas sois y elige una mesa</p>
      </div>

      <form class="card people-form" (ngSubmit)="search()">
        <div class="form-group">
          <label for="people">Número de personas</label>
          <input id="people" name="people" type="number" class="form-control"
                 [(ngModel)]="people" min="1" [max]="maxPeople" step="1" required />
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="loading()">Buscar mesas</button>
      </form>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state">
            <p>No hay mesas libres para {{ people }} personas en este momento</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-option card" [class.selected]="selected()?.id === table.id"
                      (click)="selected.set(table)">
                <span class="table-number">Mesa {{ table.number }}</span>
                <span class="table-capacity">Hasta {{ table.capacity }} personas</span>
                @if (table.description) {
                  <span class="table-description">{{ table.description }}</span>
                }
              </button>
            }
          </div>

          <div class="actions">
            <button type="button" class="btn btn-primary" [disabled]="!selected() || occupying()" (click)="continue()">
              @if (occupying()) {
                Reservando mesa...
              } @else {
                Continuar
              }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      color: var(--text-secondary);
      font-size: 14px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .people-form {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
    }
    .people-form .form-group {
      flex: 1;
      margin-bottom: 0;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      text-align: left;
      cursor: pointer;
      border: 2px solid var(--border-color);
      font: inherit;
      color: inherit;
    }
    .table-option.selected {
      border-color: var(--green-light);
      box-shadow: 0 0 0 3px var(--green-glow);
    }
    .table-number {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .table-capacity {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .table-description {
      font-size: 12px;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
    }
    @media (max-width: 600px) {
      .people-form {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly restaurantService = inject(RestaurantService)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  readonly maxPeople = MAX_PERSONAS
  readonly restaurant = signal<Restaurant | null>(null)
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly searched = signal(false)
  readonly error = signal<string | null>(null)

  people = 2
  private restaurantId = ''

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!

    // Si ya tiene mesa en este restaurante, no se ocupa otra: se vuelve directamente a la carta.
    if (this.cartStore.tableFor(this.restaurantId)) {
      this.router.navigate(['/restaurants', this.restaurantId])
      return
    }

    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => {}
    })
  }

  search(aviso: string | null = null): void {
    if (!Number.isInteger(this.people) || this.people < 1 || this.people > MAX_PERSONAS) {
      this.error.set(`Indica un número de personas entre 1 y ${MAX_PERSONAS}.`)
      return
    }
    this.error.set(aviso)
    this.selected.set(null)
    this.loading.set(true)
    this.tableService.getAvailable(this.restaurantId, this.people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('No se pudieron cargar las mesas disponibles.')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const table = this.selected()
    if (!table) return
    this.error.set(null)
    this.occupying.set(true)
    this.tableService.occupy(this.restaurantId, table.id).subscribe({
      next: (occupied) => {
        this.cartStore.setTable(this.restaurantId, occupied.id, occupied.number)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.occupying.set(false)
        if (err?.status === 409) {
          this.search(`La mesa ${table.number} acaba de ocuparse. Elige otra.`)
        } else {
          this.error.set('No se pudo reservar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
