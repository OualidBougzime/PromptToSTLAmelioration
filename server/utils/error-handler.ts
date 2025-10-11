// server/utils/error-handler.ts

export class CADAMError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message)
        this.name = 'CADAMError'
    }
}

export class RefinementError extends CADAMError {
    constructor(message: string, details?: any) {
        super(message, 'REFINEMENT_FAILED', details)
    }
}

export class ValidationError extends CADAMError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_FAILED', details)
    }
}

export function handleError(error: any): any {
    console.error('❌ Error:', error)

    if (error instanceof CADAMError) {
        return {
            error: error.message,
            code: error.code,
            details: error.details
        }
    }

    return {
        error: error.message || 'Unknown error',
        code: 'UNKNOWN_ERROR'
    }
}