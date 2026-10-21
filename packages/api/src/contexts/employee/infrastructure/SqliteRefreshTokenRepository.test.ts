import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteEmployeeRepository } from '@employee/infrastructure/SqliteEmployeeRepository.js'
import { SqliteRefreshTokenRepository } from '@employee/infrastructure/SqliteRefreshTokenRepository.js'
import type { RefreshTokenRecord } from '@employee/domain/IRefreshTokenRepository.js'

const registro = (id: string, empleado: string, familia: string, hash: string): RefreshTokenRecord => ({
    id,
    employeeId: empleado,
    familyId: familia,
    tokenHash: hash,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    revokedAt: null,
    replacedBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z')
})

describe('SqliteRefreshTokenRepository', () => {
    let db: Database
    let repo: SqliteRefreshTokenRepository

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqliteRefreshTokenRepository(db)
        for (const id of ['emp-1', 'emp-2']) {
            await db.run(
                'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, NULL)',
                [id, 'N', 'A', `${id}@resttek.com`, 'hash', 'cliente']
            )
        }
    })

    afterAll(async () => { await db.close() })

    it('guarda y recupera un token por su hash', async () => {
        await repo.save(registro('t1', 'emp-1', 'fam-1', 'hash-1'))
        const encontrado = await repo.findByHash('hash-1')
        expect(encontrado).toMatchObject({ id: 't1', employeeId: 'emp-1', familyId: 'fam-1', revokedAt: null, replacedBy: null })
        expect(encontrado?.expiresAt.toISOString()).toBe('2030-01-01T00:00:00.000Z')
    })

    it('devuelve null si el hash no existe', async () => {
        expect(await repo.findByHash('nope')).toBeNull()
    })

    it('revoca un token y anota quién lo sustituye', async () => {
        await repo.save(registro('t2', 'emp-1', 'fam-2', 'hash-2'))
        await repo.revoke('t2', 't3')
        const t = await repo.findByHash('hash-2')
        expect(t?.revokedAt).toBeInstanceOf(Date)
        expect(t?.replacedBy).toBe('t3')
    })

    it('no pisa la fecha de una revocación previa', async () => {
        await repo.save(registro('t4', 'emp-1', 'fam-4', 'hash-4'))
        await repo.revoke('t4')
        const primera = (await repo.findByHash('hash-4'))!.revokedAt!.getTime()
        await new Promise(r => setTimeout(r, 5))
        await repo.revoke('t4')
        expect((await repo.findByHash('hash-4'))!.revokedAt!.getTime()).toBe(primera)
    })

    it('revoca toda una familia sin tocar otras', async () => {
        await repo.save(registro('f1', 'emp-1', 'fam-x', 'hash-f1'))
        await repo.save(registro('f2', 'emp-1', 'fam-x', 'hash-f2'))
        await repo.save(registro('o1', 'emp-1', 'fam-y', 'hash-o1'))
        await repo.revokeFamily('fam-x')
        expect((await repo.findByHash('hash-f1'))?.revokedAt).not.toBeNull()
        expect((await repo.findByHash('hash-f2'))?.revokedAt).not.toBeNull()
        expect((await repo.findByHash('hash-o1'))?.revokedAt).toBeNull()
    })

    it('revoca todos los tokens de un empleado sin tocar a otros', async () => {
        await repo.save(registro('e1', 'emp-2', 'fam-e1', 'hash-e1'))
        await repo.save(registro('e2', 'emp-2', 'fam-e2', 'hash-e2'))
        await repo.revokeAllByEmployee('emp-2')
        expect((await repo.findByHash('hash-e1'))?.revokedAt).not.toBeNull()
        expect((await repo.findByHash('hash-e2'))?.revokedAt).not.toBeNull()
        expect((await repo.findByHash('hash-o1'))?.revokedAt).toBeNull()
    })

    it('al eliminar un empleado se eliminan sus refresh tokens (ON DELETE CASCADE)', async () => {
        await db.run(
            'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, NULL)',
            ['emp-baja', 'N', 'A', 'baja@resttek.com', 'hash', 'cliente']
        )
        await repo.save(registro('b1', 'emp-baja', 'fam-b', 'hash-b1'))

        await new SqliteEmployeeRepository(db).delete('emp-baja')

        expect(await repo.findByHash('hash-b1')).toBeNull()
    })
})
