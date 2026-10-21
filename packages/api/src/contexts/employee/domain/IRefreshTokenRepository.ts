export interface RefreshTokenRecord {
    id: string
    employeeId: string
    familyId: string
    tokenHash: string
    expiresAt: Date
    revokedAt: Date | null
    replacedBy: string | null
    createdAt: Date
}

export interface IRefreshTokenRepository {
    save(record: RefreshTokenRecord): Promise<void>
    findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>
    /** Revoca un token y, si se rota, anota el id del token que lo sustituye. */
    revoke(id: string, replacedBy?: string | null): Promise<void>
    revokeFamily(familyId: string): Promise<void>
    revokeAllByEmployee(employeeId: string): Promise<void>
}
