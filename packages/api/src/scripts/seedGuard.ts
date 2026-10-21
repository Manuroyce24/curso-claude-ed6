// Las cuentas del seed usan su propio email como contraseña: nunca deben crearse en producción.
export function assertSeedAllowed(env: Record<string, string | undefined>): void {
    if (env.NODE_ENV === 'production') {
        throw new Error('El seed crea cuentas con contraseñas triviales y no puede ejecutarse en producción.')
    }
}
