import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { API_URL } from '../tokens'
import { AuthStore } from './auth.store'

interface LoginResponse {
  token: string
  refreshToken: string
  employee: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    restaurantId: string | null
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient)
  private readonly store = inject(AuthStore)
  private readonly router = inject(Router)

  private readonly apiUrl = inject(API_URL)

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
    )
    this.store.setSession(response.token, response.employee, response.refreshToken)
  }

  async register(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/register`, {
        firstName,
        lastName,
        email,
        password
      })
    )
    this.store.setSession(response.token, response.employee, response.refreshToken)
  }

  private refreshEnCurso: Promise<void> | null = null

  /**
   * Renueva el par de tokens con el refresh token guardado. Las llamadas simultáneas
   * comparten una sola petición: el refresh rota y una segunda petición lo invalidaría.
   */
  refresh(): Promise<void> {
    if (this.refreshEnCurso) return this.refreshEnCurso

    const refreshToken = this.store.refreshToken()
    if (!refreshToken) return Promise.reject(new Error('No hay refresh token'))

    this.refreshEnCurso = firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
    )
      .then(response => this.store.setSession(response.token, response.employee, response.refreshToken))
      .finally(() => { this.refreshEnCurso = null })

    return this.refreshEnCurso
  }

  logout(): void {
    const refreshToken = this.store.refreshToken()
    const token = this.store.token()
    // Revoca el refresh en el servidor (mejor esfuerzo). El header se fija a mano porque la sesión se limpia justo después.
    if (refreshToken && token) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ error: () => undefined })
    }
    this.store.clearSession()
    this.router.navigate(['/login'])
  }
}
