import { inject } from '@angular/core'
import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { catchError, from, switchMap, throwError } from 'rxjs'
import { Router, NavigationExtras } from '@angular/router'
import { AuthStore } from '../auth/auth.store'
import { AuthService } from '../auth/auth.service'
import { debeRenovarSesion } from '../auth/auth.utils'

let isRedirecting = false

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router)
  const auth = inject(AuthStore)
  const authService = inject(AuthService)

  const cerrarSesion = (error: HttpErrorResponse) => {
    if (error.status === 401 && !isRedirecting) {
      const currentUrl = router.url
      if (currentUrl.includes('/login')) {
        auth.clearSession()
        return throwError(() => error)
      }

      isRedirecting = true
      auth.clearSession()

      const navigationExtras: NavigationExtras = { replaceUrl: true }
      router.navigate(['/login'], navigationExtras).finally(() => {
        setTimeout(() => { isRedirecting = false }, 1000)
      })
    }
    return throwError(() => error)
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!debeRenovarSesion(req.url, error.status, auth.refreshToken() !== null)) {
        return cerrarSesion(error)
      }

      // 401 con refresh token: renueva una vez (peticiones simultáneas comparten el refresh) y reintenta.
      return from(authService.refresh()).pipe(
        switchMap(() => next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } }))),
        catchError(() => cerrarSesion(error))
      )
    })
  )
}
