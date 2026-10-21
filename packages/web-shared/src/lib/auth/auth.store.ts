import { Injectable, signal, computed } from '@angular/core'
import { haySesion, parseStoredUser } from './auth.utils'

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _token = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  )
  private readonly _refreshToken = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('auth_refresh') : null
  )
  private readonly _user = signal<any>(
    typeof localStorage !== 'undefined' ? parseStoredUser(localStorage.getItem('auth_user')) : null
  )

  readonly token = this._token.asReadonly()
  readonly user = this._user.asReadonly()
  // Un access token caducado solo cuenta como sesión si hay refresh token con el que renovarlo.
  readonly refreshToken = this._refreshToken.asReadonly()
  readonly isAuthenticated = computed(() => haySesion(this._token(), this._refreshToken()))
  readonly userRole = computed(() => this._user()?.role ?? null)

  setSession(token: string, user: any, refreshToken: string | null = this._refreshToken()): void {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    if (refreshToken) localStorage.setItem('auth_refresh', refreshToken)
    this._token.set(token)
    this._user.set(user)
    this._refreshToken.set(refreshToken)
  }

  clearSession(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_refresh')
    this._refreshToken.set(null)
    this._token.set(null)
    this._user.set(null)
  }
}
