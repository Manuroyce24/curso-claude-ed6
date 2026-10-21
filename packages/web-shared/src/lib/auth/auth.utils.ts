export interface UsuarioConRol {
  role?: string | null
}

/** Cerrado por defecto: si la ruta no declara roles, nadie accede. */
export function puedeAcceder(user: UsuarioConRol | null, roles: readonly string[] | undefined): boolean {
  if (!user?.role || !roles || roles.length === 0) return false
  return roles.includes(user.role)
}

/** Lee el claim `exp` (segundos) de un JWT sin verificar la firma. Devuelve null si no es legible. */
export function decodeJwtExp(token: string): number | null {
  try {
    const partes = token.split('.')
    if (partes.length !== 3 || !partes[1]) return null
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return typeof payload?.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/** Un token ilegible se considera caducado. `margenSegundos` anticipa el vencimiento. */
export function isTokenExpired(token: string, ahoraMs: number = Date.now(), margenSegundos = 10): boolean {
  const exp = decodeJwtExp(token)
  if (exp === null) return true
  return exp * 1000 - margenSegundos * 1000 <= ahoraMs
}

export interface UsuarioGuardado {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  role: string
  restaurantId?: string | null
}

/** Lee el usuario guardado en el navegador; un valor corrupto no debe romper el arranque. */
export function parseStoredUser(raw: string | null): UsuarioGuardado | null {
  if (!raw) return null
  try {
    const valor = JSON.parse(raw)
    if (valor && typeof valor === 'object' && !Array.isArray(valor) && typeof valor.role === 'string') {
      return valor as UsuarioGuardado
    }
  } catch {
    // se trata como sin sesión
  }
  return null
}
