import { WeakPasswordError } from '@errors/DomainErrors.js'

const LONGITUD_MINIMA = 10
// bcrypt ignora todo lo que supere 72 bytes.
const LONGITUD_MAXIMA = 72

export function validatePlainPassword(value: unknown): string {
    if (typeof value !== 'string' || value.length < LONGITUD_MINIMA || value.length > LONGITUD_MAXIMA) {
        throw new WeakPasswordError()
    }
    return value
}
