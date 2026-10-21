import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { AuthStore } from '@resttek/web-shared'

/** Página de inicio según el rol; los roles sin acceso a esta app vuelven al login. */
export const defaultRouteGuard: CanActivateFn = () => {
  const role = inject(AuthStore).userRole()
  const destino = role === 'cocinero' || role === 'manager' ? '/cocina'
    : role === 'camarero' ? '/barra'
    : '/login'
  return inject(Router).createUrlTree([destino])
}
