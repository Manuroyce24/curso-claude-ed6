import { Injectable, signal, computed } from '@angular/core'
import { isTokenExpired, parseStoredUser } from './auth.utils'

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _token = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  )
  private readonly _user = signal<any>(
    typeof localStorage !== 'undefined' ? parseStoredUser(localStorage.getItem('auth_user')) : null
  )

  readonly token = this._token.asReadonly()
  readonly user = this._user.asReadonly()
  // Un token caducado o ilegible no cuenta como sesión: evita pintar la app y esperar al primer 401.
  readonly isAuthenticated = computed(() => {
    const token = this._token()
    return token !== null && !isTokenExpired(token, Date.now(), 0)
  })
  readonly userRole = computed(() => this._user()?.role ?? null)

  setSession(token: string, user: any): void {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    this._token.set(token)
    this._user.set(user)
  }

  clearSession(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    this._token.set(null)
    this._user.set(null)
  }
}
