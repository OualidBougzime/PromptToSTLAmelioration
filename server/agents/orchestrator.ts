// server/agents/orchestrator.ts - VERSION MISE À JOUR
import { EventEmitter } from 'events'
import { AnalyzerAgent } from './analyzer'
import { DesignerAgent } from './designer'
import { EngineerAgent } from './engineer'
import { OptimizerAgent } from './optimizer'
import { ValidatorAgent } from './validator'

export class AgentOrchestrator extends EventEmitter {
    private agents: Map<string, any> = new Map()
    private pipelines: Map<string, any[]> = new Map()

    constructor() {
        super()
        this.initializeAgents()
        this.setupPipelines()
    }

    private initializeAgents() {
        // Instancier tous les agents
        this.agents.set('analyzer', new AnalyzerAgent())
        this.agents.set('designer', new DesignerAgent())
        this.agents.set('engineer', new EngineerAgent())
        this.agents.set('optimizer', new OptimizerAgent())
        this.agents.set('validator', new ValidatorAgent())

        // Écouter les événements de tous les agents
        for (const [name, agent] of this.agents.entries()) {
            agent.on('state', (state: any) => {
                this.emit('agent:update', name, state)
            })
        }
    }

    private setupPipelines() {
        // Pipeline de génération complète
        this.pipelines.set('generate', [
            'analyzer',    // Analyse le prompt
            'designer',    // Crée le design
            'engineer',    // Génère le code
            'validator'    // Valide le résultat
        ])

        // Pipeline d'optimisation
        this.pipelines.set('optimize', [
            'analyzer',
            'optimizer',
            'engineer',
            'validator'
        ])
    }

    async process(prompt: string, options: any = {}): Promise<any> {
        console.log(`\n🎯 Processing prompt: "${prompt}"\n`)

        const pipeline = options.pipeline || 'generate'
        const agents = this.pipelines.get(pipeline) || []

        const context: any = {
            prompt,
            options,
            results: {},
            metadata: {
                startTime: Date.now(),
                pipeline
            }
        }

        // Exécuter la pipeline agent par agent
        for (const agentName of agents) {
            try {
                console.log(`\n🤖 Running ${agentName}...`)

                const agent = this.agents.get(agentName)
                if (!agent) {
                    console.warn(`⚠️ Agent ${agentName} not found`)
                    continue
                }

                // Appeler la méthode principale de l'agent
                const result = await this.runAgent(agent, agentName, context)

                // Stocker le résultat
                context.results[agentName] = result

                console.log(`✅ ${agentName} completed`)

                // Callback de progression
                if (options.onAgentUpdate) {
                    options.onAgentUpdate(agentName, { status: 'complete', progress: 100 })
                }

            } catch (error: any) {
                console.error(`❌ Error in ${agentName}:`, error.message)

                // En cas d'erreur, continuer avec des valeurs par défaut
                context.results[agentName] = {
                    error: error.message,
                    fallback: true
                }
            }
        }

        // Construire le résultat final
        const finalResult = this.buildResult(context)

        context.metadata.endTime = Date.now()
        context.metadata.duration = context.metadata.endTime - context.metadata.startTime

        console.log(`\n✨ Generation completed in ${context.metadata.duration}ms\n`)

        return finalResult
    }

    private async runAgent(agent: any, name: string, context: any): Promise<any> {
        switch (name) {
            case 'analyzer':
                return await agent.analyze(context.prompt, context)

            case 'designer':
                return await agent.design(context.results.analyzer, context)

            case 'engineer':
                return await agent.engineer(context.results.designer, context)

            case 'optimizer':
                return await agent.optimize(context.results.engineer, context)

            case 'validator':
                return await agent.validate(context.results.engineer, context)

            default:
                throw new Error(`Unknown agent method for ${name}`)
        }
    }

    private buildResult(context: any): any {
        const { results } = context

        return {
            // Informations de base
            prompt: context.prompt,
            timestamp: Date.now(),
            duration: context.metadata.duration,

            // Résultats de l'analyse
            analysis: results.analyzer || {},

            // Design généré
            design: results.designer || {},

            // Code et modèle
            code: {
                language: results.engineer?.language || 'cadquery',
                cadquery: results.engineer?.code || '',
                python: results.engineer?.code || ''
            },

            // Modèle 3D
            model: {
                representations: {
                    threejs: results.engineer?.mesh || null
                }
            },

            // Validation
            validation: results.validator || results.engineer?.validation || {},

            // Métadonnées
            metadata: {
                pipeline: context.metadata.pipeline,
                agents: Object.keys(results),
                complexity: results.analyzer?.complexity
            }
        }
    }

    async modify(modelId: string, modification: any): Promise<any> {
        console.log(`\n🔧 Modifying model ${modelId}:`, modification)

        // Récupérer le contexte du modèle (à implémenter avec un store)
        // Pour l'instant, on va juste régénérer

        return {
            success: true,
            message: 'Modification applied'
        }
    }
}