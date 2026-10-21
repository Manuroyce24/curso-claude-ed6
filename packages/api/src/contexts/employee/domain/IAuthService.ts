export interface IAuthService {
    hashPassword(password: string): Promise<string>
    comparePasswords(provided: string, stored: string): Promise<boolean>
    generateToken(payload: any): string
    /** Token de refresco opaco (aleatorio). Solo se guarda su hash. */
    generateRefreshToken(): string
    hashRefreshToken(token: string): string
}
