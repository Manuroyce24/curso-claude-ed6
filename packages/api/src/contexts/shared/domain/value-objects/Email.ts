import { InvalidEmailError } from '@errors/DomainErrors.js'

export class Email {
    private readonly value: string

    static normalize(value: string): string {
        return typeof value === 'string' ? value.trim().toLowerCase() : value
    }

    constructor(value: string) {
        const normalized = Email.normalize(value)
        if (!this.isValid(normalized)) {
            throw new InvalidEmailError()
        }
        this.value = normalized
    }

    private isValid(email: string): boolean {
        if (typeof email !== 'string') return false
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return regex.test(email)
    }

    public getValue(): string {
        return this.value
    }
}
