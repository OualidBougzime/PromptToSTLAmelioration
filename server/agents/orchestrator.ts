// server/agents/orchestrator.ts - VERSION 2.0 CORRIGÉE
import { EventEmitter } from 'events'
import { LLMAgent } from './llm-agent'
import { EngineerAgent } from './engineer'
import { AnalyzerAgent } from './analyzer'
import { RetrievalAgent } from '../rag/retrieval-agent'
import { PlanningAgent } from './planning-agent'
import { ValidationAgentV2 } from './validation-agent-v2'
import { MetricsCollector } from '../monitoring/metrics'

export class AgentOrchestratorV2 extends EventEmitter {
    private analyzer: AnalyzerAgent
    private retrieval: RetrievalAgent
    private planning: PlanningAgent
    private llm: LLMAgent
    private engineer: EngineerAgent
    private validator: ValidationAgentV2
    private metrics: MetricsCollector

    constructor() {
        super()
        this.analyzer = new AnalyzerAgent()
        this.retrieval = new RetrievalAgent()
        this.planning = new PlanningAgent()
        this.llm = new LLMAgent()
        this.engineer = new EngineerAgent()
        this.validator = new ValidationAgentV2()
        this.metrics = new MetricsCollector()

        // Forward events
        this.analyzer.on('state', (state) => this.emit('agent:update', 'analyzer', state))
        this.retrieval.on('state', (state) => this.emit('agent:update', 'retrieval', state))
        this.planning.on('state', (state) => this.emit('agent:update', 'planning', state))
        this.validator.on('state', (state) => this.emit('agent:update', 'validator', state))
    }

    async initialize() {
        await this.retrieval.initialize()
        console.log('✅ Orchestrator V2 initialized')
    }

    async process(prompt: string, options: any = {}): Promise<any> {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`🎯 PROCESSING: "${prompt}"`)
        console.log('='.repeat(60))

        const startTime = Date.now()

        try {
            // === ÉTAPE 1 : ANALYZE ===
            console.log('\n📊 Step 1: ANALYZE')
            const analysis = await this.analyzer.analyze(prompt)

            console.log(`  ✓ Domain: ${analysis.domain.category}`)
            console.log(`  ✓ Complexity: ${analysis.complexity.score}/10`)
            console.log(`  ✓ Sub-tasks: ${analysis.decomposition?.subTasks.length || 0}`)

            // === ÉTAPE 2 : RETRIEVE ===
            console.log('\n🔍 Step 2: RETRIEVE EXAMPLES')
            const examples = await this.retrieval.retrieveExamples(prompt, analysis)

            console.log(`  ✓ Retrieved: ${examples.length} examples`)
            examples.forEach((ex, i) => {
                console.log(`    ${i + 1}. ${ex.prompt} (${(ex.score * 100).toFixed(0)}% match)`)
            })

            // === ÉTAPE 3 : PLAN ===
            console.log('\n📋 Step 3: GENERATE EXECUTION PLAN')
            const plan = await this.planning.generateExecutionPlan(analysis, examples)

            console.log(`  ✓ Strategy: ${plan.strategy}`)
            console.log(`  ✓ Phases: ${plan.phases.length}`)
            console.log(`  ✓ Estimated time: ${plan.estimatedTime}s`)

            // === ÉTAPE 4 : GENERATE WITH REFINEMENT LOOP ===
            console.log('\n🔄 Step 4: GENERATE CODE (with refinement loop)')
            const result = await this.generateWithRefinementLoop(
                prompt,
                analysis,
                plan,
                examples
            )

            // === ÉTAPE 5 : FINAL VALIDATION ===
            console.log('\n✅ Step 5: FINAL VALIDATION')
            const finalValidation = await this.validator.validateMultiLayer(
                result.code,
                plan,
                analysis.decomposition.constraints
            )

            result.validation = finalValidation

            // === METRICS ===
            const duration = Date.now() - startTime
            this.metrics.logGeneration({
                prompt,
                timestamp: Date.now(),
                duration,
                attempts: result.attempts,
                success: finalValidation.passed,
                complexity: analysis.complexity.score
            })

            // === LEARN FROM SUCCESS ===
            if (finalValidation.passed && finalValidation.overallScore >= 80) {
                await this.retrieval.addSuccessfulGeneration(prompt, result.code, analysis)
            }

            console.log(`\n${'='.repeat(60)}`)
            console.log(`✅ SUCCESS - Score: ${finalValidation.overallScore}/100 in ${duration}ms`)
            console.log('='.repeat(60) + '\n') // ✅ CORRIGÉ ICI

            return {
                prompt,
                timestamp: Date.now(),
                duration,
                attempts: result.attempts,
                code: { language: 'cadquery', cadquery: result.code, python: result.code },
                model: { representations: { threejs: result.mesh } },
                validation: finalValidation,
                analysis,
                plan
            }

        } catch (error: any) {
            console.error('\n❌ ORCHESTRATOR ERROR:', error.message)
            return this.buildFallback(prompt, error)
        }
    }

    /**
     * 🔥 CŒUR DU SYSTÈME : Refinement Loop Intelligent
     */
    private async generateWithRefinementLoop(
        prompt: string,
        analysis: any,
        plan: any,
        examples: any[]
    ): Promise<any> {
        const maxIterations = 5
        let attempt = 0
        let lastError: any = null
        let bestResult: any = null
        let bestScore = 0

        while (attempt < maxIterations) {
            attempt++
            console.log(`\n  🔄 Refinement Iteration ${attempt}/${maxIterations}`)

            try {
                // 1. Generate code
                console.log(`    → Generating code...`)
                const code = await this.llm.generateWithRAG(
                    prompt,
                    plan,
                    examples,
                    { attempt, previousErrors: lastError ? [lastError] : [] }
                )

                // 2. Quick validation
                console.log(`    → Validating...`)
                const validation = await this.validator.validateMultiLayer(
                    code,
                    plan,
                    analysis.decomposition.constraints
                )

                // 3. Check if good enough
                if (validation.passed && validation.overallScore >= 80) {
                    console.log(`    ✅ SUCCESS - Score: ${validation.overallScore}/100`)

                    return {
                        code,
                        mesh: validation.layers.execution.mesh,
                        validation,
                        attempts: attempt
                    }
                }

                // 4. Track best result
                if (validation.overallScore > bestScore) {
                    bestScore = validation.overallScore
                    bestResult = {
                        code,
                        mesh: validation.layers.execution?.mesh,
                        validation,
                        attempts: attempt
                    }
                    console.log(`    📊 New best score: ${bestScore}/100`)
                }

                // 5. Prepare for next iteration
                lastError = {
                    attempt,
                    score: validation.overallScore,
                    errors: validation.errors,
                    warnings: validation.warnings
                }

                // 6. If execution failed, try to fix with LLM feedback
                if (!validation.layers.execution?.success) {
                    console.log(`    🔧 Attempting repair with LLM feedback...`)

                    const repairedCode = await this.llm.improveCodeWithFeedback(
                        code,
                        validation.errors.join('; '),
                        'execution_error'
                    )

                    // Quick revalidation
                    const revalidation = await this.validator.validateMultiLayer(
                        repairedCode,
                        plan,
                        analysis.decomposition.constraints
                    )

                    if (revalidation.passed) {
                        console.log(`    ✅ REPAIR SUCCESSFUL`)
                        return {
                            code: repairedCode,
                            mesh: revalidation.layers.execution.mesh,
                            validation: revalidation,
                            attempts: attempt
                        }
                    }
                }

            } catch (error: any) {
                console.log(`    ❌ Iteration ${attempt} failed: ${error.message}`)
                lastError = error.message
            }
        }

        // Retourner le meilleur résultat obtenu
        if (bestResult) {
            console.log(`\n  ⚠️ Max iterations reached. Returning best: ${bestScore}/100`)
            return bestResult
        }

        throw new Error('All refinement iterations failed')
    }

    private buildFallback(prompt: string, error: any): any {
        return {
            prompt,
            timestamp: Date.now(),
            code: { language: 'cadquery', cadquery: '# Generation failed' },
            model: { representations: { threejs: { vertices: [], faces: [], normals: [] } } },
            validation: { passed: false, overallScore: 0, errors: [error.message] },
            error: error.message
        }
    }

    getMetrics() { return this.metrics.getStats() }
    getRecentFailures() { return this.metrics.getRecentFailures() }

    async modify(): Promise<any> {
        return { success: true }
    }
}