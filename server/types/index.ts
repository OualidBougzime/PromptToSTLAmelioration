// server/types/index.ts

export interface RAGExample {
    id: string
    prompt: string
    code: string
    geometricPattern: string
    constraints: string[]
    complexity: number
    score?: number
}

export interface ExecutionPlan {
    strategy: string
    phases: Phase[]
    constraints: Constraint[]
    examples: RAGExample[]
    estimatedComplexity: number
    estimatedTime: number
}

export interface Phase {
    id: string
    name: string
    tasks: Task[]
    approach: string
    examples?: RAGExample[]
    maxIterations?: number
}

export interface Task {
    id: string
    description: string
    dependencies: string[]
    priority: number
    code?: string
    params?: any
}

export interface Constraint {
    type: 'dimensional' | 'geometric' | 'manufacturing' | 'functional'
    category: 'hard' | 'soft'
    priority: number
    [key: string]: any
}

export interface ValidationResult {
    passed: boolean
    overallScore: number
    layers: {
        syntax?: any
        static?: any
        execution?: any
        geometry?: any
        constraints?: any
    }
    errors: string[]
    warnings: string[]
    suggestions: string[]
}