import { Database } from '@config/database.js'
import type { IRefreshTokenRepository, RefreshTokenRecord } from '@employee/domain/IRefreshTokenRepository.js'

interface RefreshTokenRow {
    id: string
    employee_id: string
    family_id: string
    token_hash: string
    expires_at: string
    revoked_at: string | null
    replaced_by: string | null
    created_at: string
}

export class SqliteRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private readonly db: Database) {}

    async save(record: RefreshTokenRecord): Promise<void> {
        await this.db.run(
            'INSERT INTO refresh_tokens (id, employee_id, family_id, token_hash, expires_at, revoked_at, replaced_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                record.id,
                record.employeeId,
                record.familyId,
                record.tokenHash,
                record.expiresAt.toISOString(),
                record.revokedAt?.toISOString() ?? null,
                record.replacedBy,
                record.createdAt.toISOString()
            ]
        )
    }

    async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
        const row = await this.db.get<RefreshTokenRow>(
            'SELECT * FROM refresh_tokens WHERE token_hash = ?',
            [tokenHash]
        )
        return row ? this.mapToRecord(row) : null
    }

    async revoke(id: string, replacedBy: string | null = null): Promise<void> {
        await this.db.run(
            'UPDATE refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ? AND revoked_at IS NULL',
            [new Date().toISOString(), replacedBy, id]
        )
    }

    async revokeFamily(familyId: string): Promise<void> {
        await this.db.run(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL',
            [new Date().toISOString(), familyId]
        )
    }

    async revokeAllByEmployee(employeeId: string): Promise<void> {
        await this.db.run(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE employee_id = ? AND revoked_at IS NULL',
            [new Date().toISOString(), employeeId]
        )
    }

    private mapToRecord(row: RefreshTokenRow): RefreshTokenRecord {
        return {
            id: row.id,
            employeeId: row.employee_id,
            familyId: row.family_id,
            tokenHash: row.token_hash,
            expiresAt: new Date(row.expires_at),
            revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
            replacedBy: row.replaced_by,
            createdAt: new Date(row.created_at)
        }
    }
}
