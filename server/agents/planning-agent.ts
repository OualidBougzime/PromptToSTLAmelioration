// server/agents/planning-agent.ts
import { EventEmitter } from 'events'

export class PlanningAgent extends EventEmitter {

    /**
     * Génère un plan d'exécution hiérarchique
     */
    async generateExecutionPlan(analysis: any, retrievedExamples: any[]): Promise<any> {
        this.emit('state', { status: 'planning', progress: 0 })

        const plan = {
            strategy: this.selectStrategy(analysis),
            phases: [],
            constraints: this.orderConstraints(analysis.decomposition.constraints),
            examples: retrievedExamples,
            estimatedComplexity: analysis.complexity.score,
            estimatedTime: this.estimateTime(analysis)
        }

        // Phase 1: Base geometry
        plan.phases.push({
            id: 'phase-1',
            name: 'Base Geometry',
            tasks: analysis.decomposition.subTasks.filter(t => t.priority === 1),
            approach: 'direct_generation',
            examples: this.selectRelevantExamples(retrievedExamples, 'base')
        })

        // Phase 2: Features
        const featureTasks = analysis.decomposition.subTasks.filter(t => t.priority > 1)
        if (featureTasks.length > 0) {
            plan.phases.push({
                id: 'phase-2',
                name: 'Features & Details',
                tasks: featureTasks,
                approach: featureTasks.length > 5 ? 'progressive' : 'batch',
                examples: this.selectRelevantExamples(retrievedExamples, 'features')
            })
        }

        // Phase 3: Refinement
        plan.phases.push({
            id: 'phase-3',
            name: 'Refinement',
            tasks: [{
                id: 'refinement',
                description: 'Apply constraints and optimize',
                dependencies: ['phase-1', 'phase-2']
            }],
            approach: 'iterative',
            maxIterations: 3
        })

        this.emit('state', { status: 'complete', progress: 100 })

        console.log(`✅ Generated execution plan with ${plan.phases.length} phases`)
        return plan
    }

    private selectStrategy(analysis: any): string {
        const complexity = analysis.complexity.score

        if (complexity < 3) return 'direct'
        if (complexity < 7) return 'decomposed'
        return 'progressive_hierarchical'
    }

    private orderConstraints(constraints: any[]): any[] {
        // Order selon dépendances : foundation → positioning → relationship → derived
        const order = ['dimensional', 'geometric', 'manufacturing', 'functional']

        return constraints.sort((a, b) => {
            const aIndex = order.indexOf(a.type)
            const bIndex = order.indexOf(b.type)
            return aIndex - bIndex
        })
    }

    private estimateTime(analysis: any): number {
        // Estimation basée sur complexité
        const base = 5 // seconds
        const perTask = 3
        const tasks = analysis.decomposition.subTasks.length

        return base + (tasks * perTask)
    }

    private selectRelevantExamples(examples: any[], phase: string): any[] {
        // Filtrer exemples selon phase
        return examples.filter(ex => {
            if (phase === 'base') return ex.complexity < 4
            if (phase === 'features') return ex.complexity >= 4
            return true
        }).slice(0, 2)
    }
}