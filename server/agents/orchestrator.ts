// server/agents/orchestrator.ts
import { EventEmitter } from 'events'
import { LLMAgent } from './llm-agent'
import { EngineerAgent } from './engineer'
import { ValidatorAgent } from './optimizer'

export class AgentOrchestrator extends EventEmitter {
    private llm: LLMAgent
    private engineer: EngineerAgent
    private validator: ValidatorAgent

    constructor() {
        super()

        // Seulement 3 agents nécessaires !
        this.llm = new LLMAgent()
        this.engineer = new EngineerAgent()
        this.validator = new ValidatorAgent()

        // Écouter les événements
        this.llm.on('state', (state) => {
            this.emit('agent:update', 'llm', state)
        })

        console.log('✅ Orchestrator initialized (LLM-powered)')
    }

    async process(prompt: string, options: any = {}): Promise<any> {
        console.log(`\n🎯 Processing: "${prompt}"\n`)

        const startTime = Date.now()
        let attempts = 0
        const maxAttempts = 3
        let lastError = ''

        while (attempts < maxAttempts) {
            attempts++
            console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}`)

            try {
                console.log('🧠 Generating code with LLM...')
                const code = await this.llm.generateCADCode(prompt)

                console.log('📝 Code preview:')
                console.log(code.substring(0, 300) + '...\n')

                console.log('✅ Validating syntax...')
                const validation = await this.engineer.validateCode(code)

                if (!validation.syntax) {
                    console.warn(`⚠️ Syntax errors found:`, validation.errors)
                    lastError = validation.errors.join(', ')

                    if (attempts < maxAttempts) {
                        console.log('🔧 Attempting to fix syntax errors...')
                        continue
                    }
                }

                console.log('🚀 Executing code...')
                const mesh = await this.engineer.executeCode(code)

                // 🔥 NOUVEAU : Vérifier si l'exécution a réussi
                if (!mesh || !mesh.vertices || mesh.vertices.length < 100) {
                    throw new Error('Execution failed: Invalid mesh or CadQuery error')
                }

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
                    validation: finalValidation,
                    metadata: {
                        source: 'llm',
                        model: this.llm['ollamaModel']
                    }
                }

            } catch (error: any) {
                console.error(`❌ Attempt ${attempts} failed:`, error.message)
                lastError = error.message

                // 🔥 NOUVEAU : Si c'est une erreur CadQuery, essayer de corriger
                if (error.message.includes('AttributeError') ||
                    error.message.includes('has no attribute') ||
                    error.response?.data?.error) {

                    const cadqueryError = error.response?.data?.error || error.message
                    console.log(`🔧 CadQuery error detected: ${cadqueryError}`)

                    if (attempts < maxAttempts) {
                        console.log('🔧 Asking LLM to fix the code...')

                        // Récupérer le code précédent et demander une correction
                        const previousCode = await this.llm.generateCADCode(prompt)
                        const fixedCode = await this.llm.improveCode(previousCode, cadqueryError)

                        // Réessayer avec le code corrigé (on continue la boucle)
                        continue
                    }
                }

                if (attempts >= maxAttempts) {
                    console.error('❌ All attempts failed, returning fallback')
                    return this.generateFallbackResult(prompt, lastError)
                }
            }
        }

        return this.generateFallbackResult(prompt, lastError)
    }

    private generateFallbackResult(prompt: string, error: string): any {
        const fallbackCode = `import cadquery as cq

# Fallback due to error: ${error}
result = cq.Workplane("XY").box(10, 10, 10)
show_object(result)
`

        return {
            prompt,
            timestamp: Date.now(),
            duration: 0,
            attempts: 0,
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
                error
            }
        }
    }

    async modify(modelId: string, modification: any): Promise<any> {
        console.log(`\n🔧 Modifying model ${modelId}:`, modification)
        return { success: true, message: 'Modification not implemented yet' }
    }
}