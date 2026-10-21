import rateLimit from 'express-rate-limit'

interface OpcionesLimitador {
    max: number
    windowMs: number
}

export const crearLimitador = ({ max, windowMs }: OpcionesLimitador) =>
    rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'TooManyRequests', message: 'Too many requests, please try again later' }
    })

const enteroDeEntorno = (nombre: string, porDefecto: number): number => {
    const valor = Number(process.env[nombre])
    return Number.isInteger(valor) && valor > 0 ? valor : porDefecto
}

// Límite por IP para las rutas de autenticación. Cada ruta usa su propia instancia (contador independiente).
export const crearLimitadorAuth = () => crearLimitador({
    max: enteroDeEntorno('AUTH_RATE_LIMIT_MAX', 10),
    windowMs: enteroDeEntorno('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)
})
