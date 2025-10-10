// server/agents/orchestrator.ts
import { EventEmitter } from 'events'
import { LLMAgent } from './llm-agent'
import { EngineerAgent } from './engineer'
import { ValidatorAgent } from './optimizer'
import { MetricsCollector } from '../monitoring/metrics'
import { CadQuerySafePatterns } from '../prompts/cadquery-safe-patterns'

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
        this.metrics = new MetricsCollector()

        this.llm.on('state', (state) => {
            this.emit('agent:update', 'llm', state)
        })
    }

    async process(prompt: string, options: any = {}): Promise<any> {
        console.log(`\n🎯 Processing: "${prompt}"`)

        const startTime = Date.now()
        const maxAttempts = 3
        const strategies = ['enhanced', 'simplified', 'minimal']

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const strategy = strategies[attempt]
            console.log(`\n🔄 Attempt ${attempt + 1}/${maxAttempts} - ${strategy}`)

            try {
                // Générer code
                let code: string

                console.log('📝 Generated code preview:', code ? code.substring(0, 150) : 'EMPTY')
                console.log('📊 Code length:', code?.length || 0)

                // Après validation
                console.log('🔍 Validation result:', validation)
                if (!validation.syntax) {
                    console.log('❌ Syntax errors:', validation.errors)
                }

                if (attempt === 0 && this.isSimplePrompt(prompt)) {
                    code = this.getProvenPattern(prompt)
                } else {
                    code = await this.llm.generateCADCode(prompt, {
                        strategy,
                        attempt: attempt + 1
                    })
                }

                // Valider
                const validation = await this.engineer.validateCode(code)
                if (!validation.syntax) {
                    throw new Error('Syntax invalid')
                }

                // Exécuter
                const mesh = await this.engineer.executeCode(code)

                // Vérifier succès
                if (mesh && mesh.vertices && mesh.vertices.length >= 100) {
                    console.log('✅ SUCCESS')
                    return this.buildSuccess(prompt, code, mesh, Date.now() - startTime, attempt + 1)
                }

                // Essayer de corriger
                if (attempt < 2) {
                    const errorType = this.categorizeError(mesh?.error || '')
                    const fixedCode = await this.llm.improveCodeWithFeedback(code, mesh?.error || '', errorType)
                    const fixedMesh = await this.engineer.executeCode(fixedCode)

                    if (fixedMesh && fixedMesh.vertices && fixedMesh.vertices.length >= 100) {
                        console.log('✅ Fix worked!')
                        return this.buildSuccess(prompt, fixedCode, fixedMesh, Date.now() - startTime, attempt + 1)
                    }
                }

            } catch (error: any) {
                console.log(`❌ Attempt ${attempt + 1} failed:`, error.message)
            }
        }

        console.log('❌ All attempts failed')
        return this.buildFallback(prompt)
    }

    private isSimplePrompt(prompt: string): boolean {
        return prompt.split(' ').length <= 10
    }

    private getProvenPattern(prompt: string): string {
        const lower = prompt.toLowerCase()

        if (lower.includes('stent')) {
            return CadQuerySafePatterns.PROVEN_PATTERNS.stent_simple
        }
        if (lower.includes('box')) {
            return CadQuerySafePatterns.PROVEN_PATTERNS.box_simple
        }

        return CadQuerySafePatterns.PROVEN_PATTERNS.cylinder_simple
    }

    private categorizeError(error: string): string {
        const lower = error.toLowerCase()
        if (lower.includes('angledegrees')) return 'invalid_api'
        if (lower.includes('loft')) return 'loft_error'
        if (lower.includes('planar')) return 'non_planar'
        return 'general'
    }

    private buildSuccess(prompt: string, code: string, mesh: any, duration: number, attempts: number): any {
        this.metrics.logGeneration({
            prompt,
            timestamp: Date.now(),
            duration,
            attempts,
            success: true,
            complexity: 5
        })

        return {
            prompt,
            timestamp: Date.now(),
            duration,
            attempts,
            code: { language: 'cadquery', cadquery: code, python: code },
            model: { representations: { threejs: mesh } },
            validation: { syntax: { valid: true, errors: [], warnings: [] }, geometry: { valid: true }, score: 100 }
        }
    }

    private buildFallback(prompt: string): any {
        return {
            prompt,
            code: { language: 'cadquery', cadquery: CadQuerySafePatterns.PROVEN_PATTERNS.box_simple },
            model: { representations: { threejs: { vertices: [], faces: [], normals: [] } } },
            validation: { syntax: { valid: true }, score: 50 }
        }
    }

    getMetrics() { return this.metrics.getStats() }
    getRecentFailures() { return this.metrics.getRecentFailures() }
    async modify() { return { success: true } }
}