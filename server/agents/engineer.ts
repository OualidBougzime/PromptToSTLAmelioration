// server/agents/engineer.ts
import { EventEmitter } from 'events'
import axios from 'axios'
import { CodeValidator } from '../validation/code-validator'

export class EngineerAgent extends EventEmitter {
    private engines = {
        cadquery: 'http://localhost:8788'
    }

    async validateCode(code: string): Promise<any> {
        const preValidation = CodeValidator.validateAndFix(code)

        if (!preValidation.valid) {
            return {
                syntax: false,
                warnings: preValidation.warnings,
                errors: preValidation.errors
            }
        }

        try {
            const response = await axios.post(
                `${this.engines.cadquery}/validate`,
                { code: preValidation.code },
                { timeout: 10000 }
            )

            return {
                syntax: response.data.syntax,
                warnings: [...preValidation.warnings, ...(response.data.warnings || [])],
                errors: response.data.errors || []
            }
        } catch (error: any) {
            return {
                syntax: preValidation.valid,
                warnings: preValidation.warnings,
                errors: preValidation.errors
            }
        }
    }

    async executeCode(code: string, promptForTimeout?: string): Promise<any> {
        try {
            const timeout = 120

            const response = await axios.post(
                `${this.engines.cadquery}/execute`,
                { code, format: 'mesh', timeout },
                { timeout: timeout * 1000 + 10000 }
            )

            return {
                vertices: response.data.vertices,
                faces: response.data.faces,
                normals: response.data.normals || []
            }
        } catch (error: any) {
            if (error.response?.data) {
                return {
                    error: error.response.data.error,
                    errorType: error.response.data.error_type
                }
            }
            return { error: error.message }
        }
    }
}