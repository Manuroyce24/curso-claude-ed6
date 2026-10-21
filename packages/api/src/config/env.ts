import 'dotenv/config'

const LONGITUD_MINIMA_SECRETO = 32

export function leerJwtSecret(origen: Record<string, string | undefined>): string {
    const secreto = origen.JWT_SECRET
    if (!secreto || secreto.length < LONGITUD_MINIMA_SECRETO) {
        throw new Error(
            `JWT_SECRET es obligatorio y debe tener al menos ${LONGITUD_MINIMA_SECRETO} caracteres. ` +
            'Define la variable de entorno (ver packages/api/.env.example).'
        )
    }
    return secreto
}

export const JWT_SECRET: string = leerJwtSecret(process.env)

export const JWT_ISSUER = 'resttek-api'
export const JWT_AUDIENCE = 'resttek-app'
