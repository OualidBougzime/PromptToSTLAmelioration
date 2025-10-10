// server/agents/orchestrator.ts
import { EventEmitter } from 'events'
import { LLMAgent } from './llm-agent'
import { EngineerAgent } from './engineer'
import { ValidatorAgent } from './optimizer'
import { MetricsCollector } from '../monitoring/metrics'

export class AgentOrchestrator extends EventEmitter {
    private llm: LLMAgent
    private engineer: EngineerAgent
    private validator: ValidatorAgent
    private metrics: MetricsCollector

    constructor() {
        super()

        this.llm = new LLMAgent()
        this.engineer = new EngineerAgent()
        this.validator = new ValidatorAgent()
        this.metrics = new MetricsCollector() // 🔥 NOUVEAU

        this.llm.on('state', (state) => {
            this.emit('agent:update', 'llm', state)
        })

        console.log('✅ Orchestrator initialized with metrics')
    }

    async process(prompt: string, options: any = {}): Promise<any> {
        console.log(`\n🎯 Processing: "${prompt}"\n`)

        const startTime = Date.now()
        let attempts = 0
        const maxAttempts = 3
        const attemptHistory: Array<{ code: string, error?: string, errorType?: string }> = []

        while (attempts < maxAttempts) {
            attempts++
            console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}`)

            try {
                // Construire le prompt avec feedback des tentatives précédentes
                let enhancedPrompt = prompt

                if (attemptHistory.length > 0) {
                    const lastAttempt = attemptHistory[attemptHistory.length - 1]

                    enhancedPrompt = prompt + `\n\n⚠️ PREVIOUS ATTEMPT FAILED:
Error: ${lastAttempt.error}
Error Type: ${lastAttempt.errorType}

Please fix this specific issue and regenerate the code.
`
                }

                console.log('🧠 Generating code with LLM...')
                const code = await this.llm.generateCADCode(enhancedPrompt)

                console.log('📝 Code preview:')
                console.log(code.substring(0, 300) + '...\n')

                console.log('✅ Validating syntax...')
                const validation = await this.engineer.validateCode(code)

                if (!validation.syntax) {
                    console.warn(`⚠️ Syntax errors:`, validation.errors)

                    attemptHistory.push({
                        code,
                        error: validation.errors.join(', '),
                        errorType: 'syntax'
                    })

                    if (attempts < maxAttempts) {
                        console.log('🔧 Attempting syntax fix...')
                        continue
                    }
                }

                console.log('🚀 Executing code...')
                const mesh = await this.engineer.executeCode(code)

                // Vérifier si mesh valide
                if (!mesh || !mesh.vertices || mesh.vertices.length < 100) {
                    const errorMsg = mesh?.error || 'Invalid mesh or CadQuery error'
                    const errorType = this.categorizeError(errorMsg)

                    console.log(`❌ Execution failed: ${errorType}`)

                    attemptHistory.push({
                        code,
                        error: errorMsg,
                        errorType
                    })

                    if (attempts < maxAttempts) {
                        console.log(`🔧 Attempting to fix ${errorType} error...`)

                        // Utiliser la nouvelle méthode avec feedback spécifique
                        const fixedCode = await this.llm.improveCodeWithFeedback(code, errorMsg, errorType)

                        // Réessayer avec le code corrigé
                        try {
                            const fixedMesh = await this.engineer.executeCode(fixedCode)

                            if (fixedMesh && fixedMesh.vertices && fixedMesh.vertices.length >= 100) {
                                console.log('✅ Fix successful!')

                                const duration = Date.now() - startTime
                                return this.buildSuccessResponse(prompt, fixedCode, fixedMesh, duration, attempts)
                            }
                        } catch (fixError) {
                            console.log('⚠️ Fix attempt failed, continuing to next attempt...')
                        }

                        continue
                    }

                    throw new Error(errorMsg)
                }

                // Succès!
                console.log('🔍 Validating result...')
                const result = {
                    language: 'cadquery',
                    code,
                    validation,
                    mesh
                }

                const finalValidation = await this.validator.validate(result, {})

                const duration = Date.now() - startTime
                console.log(`\n✨ Generation completed in ${duration}ms (${attempts} attempts)\n`)

                this.metrics.logGeneration({
                    prompt,
                    timestamp: startTime,
                    duration,
                    attempts,
                    success: true,
                    complexity: this.estimateComplexity(prompt)
                })

                return this.buildSuccessResponse(prompt, code, mesh, duration, attempts)

            } catch (error: any) {
                console.error(`❌ Attempt ${attempts} failed:`, error.message)

                if (attempts >= maxAttempts) {
                    console.error('❌ All attempts failed, returning fallback')
                    return this.generateFallbackResult(prompt, error.message, attemptHistory)
                }
            }
        }

        return this.generateFallbackResult(prompt, 'Max attempts reached', attemptHistory)
    }

    // Ajouter ces méthodes helper APRÈS la méthode process()

    private categorizeError(errorMsg: string): string {
        const lower = errorMsg.toLowerCase()

        // 🔥 AJOUTER AVANT loft_error
        if (lower.includes('unexpected keyword') || lower.includes('angledegrees')) {
            return 'invalid_api_usage'
        }

        if (lower.includes('wires not planar') || lower.includes('not planar')) {
            return 'non_planar_wire'
        }

        if (lower.includes('more than one wire') || lower.includes('loft')) {
            return 'loft_error'
        }

        if (lower.includes('brep') || lower.includes('command not done')) {
            return 'geometric_invalid'
        }
        if (lower.includes('no pending wires') || lower.includes('wire')) {
            return 'unclosed_wire'
        }
        if (lower.includes('fillet')) {
            return 'fillet_error'
        }
        if (lower.includes('boolean') || lower.includes('union') || lower.includes('cut')) {
            return 'boolean_operation'
        }
        if (lower.includes('timeout') || lower.includes('300')) {
            return 'timeout'
        }

        return 'general'
    }

    private buildSuccessResponse(prompt: string, code: string, mesh: any, duration: number, attempts: number): any {
        return {
            prompt,
            timestamp: Date.now(),
            duration,
            attempts,
            code: {
                language: 'cadquery',
                cadquery: code,
                python: code
            },
            model: {
                representations: {
                    threejs: mesh
                }
            },
            validation: {
                syntax: { valid: true, errors: [], warnings: [] },
                geometry: {
                    valid: true,
                    vertices: mesh.vertices?.length || 0,
                    faces: mesh.faces?.length || 0
                },
                score: 100
            },
            metadata: {
                source: 'llm',
                model: this.llm['ollamaModel']
            }
        }
    }

    private estimateComplexity(prompt: string): number {
        let score = 1
        const lower = prompt.toLowerCase()

        // Lattice = very complex
        if (lower.includes('lattice') || lower.includes('gyroid')) score += 3

        // Medical = complex
        if (lower.includes('stent') || lower.includes('actuator')) score += 2

        // Features add complexity
        const features = ['fillet', 'chamfer', 'hole', 'array', 'pattern']
        features.forEach(f => {
            if (lower.includes(f)) score += 1
        })

        return Math.min(score, 10)
    }

    // Ajouter endpoint pour voir les stats
    getMetrics() {
        return this.metrics.getStats()
    }

    getRecentFailures() {
        return this.metrics.getRecentFailures()
    }

    private generateFallbackResult(prompt: string, error: string, attemptHistory: any[]): any {
        const fallbackCode = `import cadquery as cq

# Fallback due to error: ${error}
# All ${attemptHistory.length} attempts failed

result = cq.Workplane("XY").box(10.0, 10.0, 10.0)
show_object(result)
`
        // Log failed attempt
        this.metrics.logGeneration({
            prompt,
            timestamp: Date.now(),
            duration: 0,
            attempts: attemptHistory.length,
            success: false,
            errorType: 'all_attempts_failed',
            complexity: this.estimateComplexity(prompt)
        })

        return {
            prompt,
            timestamp: Date.now(),
            duration: 0,
            attempts: attemptHistory.length,
            code: {
                language: 'cadquery',
                cadquery: fallbackCode,
                python: fallbackCode
            },
            model: {
                representations: {
                    threejs: {
                        vertices: [
                            -5, -5, 5, 5, -5, 5, 5, 5, 5, -5, 5, 5,
                            -5, -5, -5, 5, -5, -5, 5, 5, -5, -5, 5, -5
                        ],
                        faces: [
                            0, 1, 2, 0, 2, 3,
                            4, 6, 5, 4, 7, 6,
                            4, 0, 3, 4, 3, 7,
                            1, 5, 6, 1, 6, 2,
                            3, 2, 6, 3, 6, 7,
                            4, 5, 1, 4, 1, 0
                        ],
                        normals: []
                    }
                }
            },
            validation: {
                syntax: { valid: false, errors: [error], warnings: [] },
                geometry: { valid: false },
                score: 0
            },
            metadata: {
                source: 'fallback',
                error,
                attemptHistory
            }
        }
    }

    async modify(modelId: string, modification: any): Promise<any> {
        console.log(`\n🔧 Modifying model ${modelId}:`, modification)
        return { success: true, message: 'Modification not implemented yet' }
    }
}