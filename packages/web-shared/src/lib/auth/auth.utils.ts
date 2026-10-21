export interface UsuarioConRol {
  role?: string | null
}

/** Cerrado por defecto: si la ruta no declara roles, nadie accede. */
export function puedeAcceder(user: UsuarioConRol | null, roles: readonly string[] | undefined): boolean {
  if (!user?.role || !roles || roles.length === 0) return false
  return roles.includes(user.role)
}
