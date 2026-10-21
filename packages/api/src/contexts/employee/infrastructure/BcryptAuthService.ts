import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, ACCESS_TOKEN_TTL_SECONDS } from '@config/env.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'

const SALT_ROUNDS = 10

export class BcryptAuthService implements IAuthService {
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS)
    }

    async comparePasswords(provided: string, stored: string): Promise<boolean> {
        return bcrypt.compare(provided, stored)
    }

    generateToken(payload: any): string {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
            algorithm: 'HS256',
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        })
    }

    generateRefreshToken(): string {
        return randomBytes(32).toString('base64url')
    }

    hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex')
    }
}
