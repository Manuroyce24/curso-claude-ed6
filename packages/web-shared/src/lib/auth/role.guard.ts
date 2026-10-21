import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { AuthStore } from './auth.store'
import { puedeAcceder } from './auth.utils'

/**
 * Restringe una ruta a los roles de `data.roles`. Es solo una barrera de UX:
 * la autorización real la hace la API.
 * Si el usuario no tiene permiso, redirige a `data.forbiddenRedirect` (por defecto `/login`).
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore)
  const router = inject(Router)

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login'])

  if (puedeAcceder(auth.user(), route.data['roles'])) return true

  const destino: string = route.data['forbiddenRedirect'] ?? '/login'
  return router.createUrlTree([destino])
}
