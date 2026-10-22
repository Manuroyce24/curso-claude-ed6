import { describe, it, expect } from 'vitest'
import { AppError } from '@errors/AppError.js'
import {
    TableNotFoundError,
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidTableDescriptionError,
    InvalidTableStatusError,
    InvalidPartySizeError,
    DuplicatedTableNumberError,
    TableNotAvailableError
} from '@errors/DomainErrors.js'

describe('errores de mesa', () => {
    it.each([
        [new TableNotFoundError(), 'TableNotFoundError', 'Table not found'],
        [new InvalidTableNumberError(), 'InvalidTableNumberError', 'Table number must be an integer greater than 0'],
        [new InvalidCapacityError(), 'InvalidCapacityError', 'Capacity must be an integer between 1 and 50'],
        [new InvalidTableDescriptionError(), 'InvalidTableDescriptionError', 'Description must be a text of up to 200 characters'],
        [new InvalidTableStatusError(), 'InvalidTableStatusError', 'Invalid table status'],
        [new InvalidPartySizeError(), 'InvalidPartySizeError', 'People must be an integer between 1 and 50'],
        [new DuplicatedTableNumberError(), 'DuplicatedTableNumberError', 'Table number is already in use in this restaurant'],
        [new TableNotAvailableError(), 'TableNotAvailableError', 'Table is not available']
    ])('%s es un AppError con nombre y mensaje', (error, nombre, mensaje) => {
        expect(error).toBeInstanceOf(AppError)
        expect(error.name).toBe(nombre)
        expect(error.message).toBe(mensaje)
    })

    it('InvalidTableStatusError admite un mensaje propio', () => {
        expect(new InvalidTableStatusError('Estado inválido: x').message).toBe('Estado inválido: x')
    })
})
