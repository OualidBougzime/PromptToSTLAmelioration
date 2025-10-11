// server/agents/analyzer.ts - VERSION COMPLÈTE CORRIGÉE
import { EventEmitter } from 'events'
import { NLPProcessor } from '../nlp/processor'
import { DomainClassifier } from '../ml/classifier'
import { HierarchicalParser, ParsedGeometry } from '../nlp/hierarchical-parser'
import { MedicalPatternGenerator } from '../generators/medical-patterns'
import { OptimizedPatterns } from '../generators/optimized-patterns'

export class AnalyzerAgent extends EventEmitter {
    private nlp: NLPProcessor
    private classifier: DomainClassifier
    private hierarchicalParser: HierarchicalParser

    constructor() {
        super()
        this.nlp = new NLPProcessor()
        this.classifier = new DomainClassifier()
        this.hierarchicalParser = new HierarchicalParser()
    }

    async analyze(prompt: string, context: any = {}): Promise<any> {
        this.emit('state', { status: 'analyzing', progress: 0 })

        try {
            // 1. NLP Processing
            const nlpResult = await this.nlp.process(prompt)

            // 2. Hierarchical Parsing
            const parsedGeometry = this.hierarchicalParser.parse(prompt)

            // 3. Domain Classification
            const domain = await this.classifier.classify(prompt)

            // 4. Detect specialized patterns
            const pattern = this.detectPattern(prompt, parsedGeometry)

            // 5. 🔥 DÉCOMPOSITION HIÉRARCHIQUE (NOUVEAU)
            const decomposition = this.decomposeComplexPrompt(prompt, nlpResult)

            // 6. Build dependency graph
            const dependencyGraph = this.buildDependencyGraph(decomposition.subTasks)

            // 7. Assess complexity
            const complexity = this.assessComplexity(decomposition, nlpResult)

            this.emit('state', { status: 'complete', progress: 100 })

            return {
                prompt,
                nlp: nlpResult,
                domain,
                decomposition,        // ✅ AJOUTÉ
                dependencyGraph,      // ✅ AJOUTÉ
                pattern,
                complexity,
                isSpecializedPattern: !!pattern,
                geometry: this.decomposeGeometry(nlpResult),
                constraints: this.extractConstraints(nlpResult, decomposition)
            }
        } catch (error: any) {
            console.error('❌ Analyzer error:', error)

            // Retourner une structure minimale valide en cas d'erreur
            return {
                prompt,
                domain: { category: 'general', confidence: 0.5 },
                decomposition: {
                    mainTask: { shape: 'box', reason: 'fallback' },
                    subTasks: [{
                        id: 'task-0',
                        description: 'Create basic shape',
                        dependencies: [],
                        priority: 1
                    }],
                    constraints: []
                },
                dependencyGraph: { nodes: [], edges: [] },
                complexity: { score: 3, level: 'simple', factors: {} },
                isSpecializedPattern: false
            }
        }
    }

    /**
     * 🔥 DÉCOMPOSITION HIÉRARCHIQUE (NOUVELLE MÉTHODE)
     */
    private decomposeComplexPrompt(prompt: string, nlpResult: any): any {
        const lower = prompt.toLowerCase()

        // 1. Identifier tâche principale
        const mainTask = this.extractMainTask(prompt, nlpResult)

        // 2. Décomposer en sous-tâches
        const subTasks: any[] = []
        let taskId = 0

        // Base shape (toujours présente)
        subTasks.push({
            id: `task-${taskId++}`,
            description: `Create base ${mainTask.shape}`,
            dependencies: [],
            priority: 1,
            code: this.generateBaseShapeCode(mainTask.shape, nlpResult.dimensions)
        })

        // Features additionnelles
        if (nlpResult.features && nlpResult.features.length > 0) {
            nlpResult.features.forEach((feature: any, idx: number) => {
                subTasks.push({
                    id: `task-${taskId++}`,
                    description: `Add ${feature.type}`,
                    dependencies: ['task-0'], // Dépend de la base shape
                    priority: 2 + idx,
                    params: feature.params
                })
            })
        }

        // Contraintes
        const constraints = this.extractDetailedConstraints(prompt, nlpResult)

        return {
            mainTask,
            subTasks,
            constraints
        }
    }

    private extractMainTask(prompt: string, nlpResult: any): any {
        const shapes = nlpResult.shapes || []

        if (shapes.length === 0) {
            // Fallback
            return {
                shape: 'box',
                reason: 'default',
                dimensions: { width: 10, height: 10, depth: 10 }
            }
        }

        return {
            shape: shapes[0].type,
            dimensions: this.inferParameters(shapes[0].type, nlpResult.dimensions),
            confidence: shapes[0].confidence || 0.5
        }
    }

    private generateBaseShapeCode(shapeType: string, dimensions: any): string {
        const dims = dimensions.values || [10, 10, 10]

        const templates: Record<string, string> = {
            'box': `cq.Workplane("XY").box(${dims[0] || 50}.0, ${dims[1] || 30}.0, ${dims[2] || 20}.0)`,
            'cylinder': `cq.Workplane("XY").circle(${(dims[0] || 10) / 2}.0).extrude(${dims[1] || 50}.0)`,
            'sphere': `cq.Workplane("XY").sphere(${dims[0] || 10}.0)`
        }

        return templates[shapeType] || templates['box']
    }

    private extractDetailedConstraints(prompt: string, nlpResult: any): any[] {
        const constraints: any[] = []

        // Dimensional constraints
        if (nlpResult.dimensions && nlpResult.dimensions.values) {
            constraints.push({
                type: 'dimensional',
                category: 'hard',
                values: nlpResult.dimensions.values,
                priority: 1
            })
        }

        // Geometric constraints
        if (nlpResult.relationships && nlpResult.relationships.length > 0) {
            nlpResult.relationships.forEach((rel: any) => {
                constraints.push({
                    type: 'geometric',
                    category: 'soft',
                    relationship: rel.type,
                    priority: 2
                })
            })
        }

        // Manufacturing constraints
        if (prompt.toLowerCase().includes('3d print')) {
            constraints.push({
                type: 'manufacturing',
                category: 'soft',
                method: '3d-printing',
                rules: {
                    minWallThickness: 1.5,
                    maxOverhang: 45,
                    supportRequired: true
                },
                priority: 3
            })
        }

        return constraints.sort((a, b) => a.priority - b.priority)
    }

    private buildDependencyGraph(subTasks: any[]): any {
        const graph = {
            nodes: subTasks.map(t => ({ id: t.id, task: t.description })),
            edges: []
        }

        subTasks.forEach(task => {
            if (task.dependencies) {
                task.dependencies.forEach((depId: string) => {
                    graph.edges.push({ from: depId, to: task.id })
                })
            }
        })

        return graph
    }

    private assessComplexity(decomposition: any, nlpResult: any): any {
        let score = 1 // Base

        // +1 par sous-tâche
        score += decomposition.subTasks.length

        // +2 par feature
        if (nlpResult.features) {
            score += nlpResult.features.length * 2
        }

        // +1 par contrainte
        score += decomposition.constraints.length

        return {
            score: Math.min(10, score),
            level: score < 3 ? 'simple' : score < 6 ? 'medium' : 'complex',
            factors: {
                shapes: decomposition.subTasks.length,
                features: nlpResult.features?.length || 0,
                constraints: decomposition.constraints.length
            }
        }
    }

    private detectPattern(prompt: string, parsed: ParsedGeometry): any | null {
        const lower = prompt.toLowerCase()
        const dims = parsed.dimensions

        // MEDICAL
        if (lower.includes('drug') && lower.includes('capsule')) {
            return {
                type: 'drug-delivery-capsule',
                domain: 'medical',
                generator: MedicalPatternGenerator.drugDeliveryCapsule,
                params: {
                    bodyLength: dims.get('length') || 20,
                    bodyDiameter: dims.get('diameter') || 8,
                    wallThickness: dims.get('thickness') || 1,
                    channelCount: 12,
                    channelDiameter: 0.5
                }
            }
        }

        if (lower.includes('stent')) {
            const expandedDia = this.extractNumber(prompt, ['expanded', 'diameter']) ||
                dims.get('diameter') || 8
            const collapsedDia = this.extractNumber(prompt, ['collapsed']) || 3
            const strutThick = this.extractNumber(prompt, ['strut', 'thickness']) || 0.3
            const ringCount = this.extractNumber(prompt, ['ring', 'rings']) || 8
            const bridgeCount = this.extractNumber(prompt, ['bridge', 'bridges']) || 3

            return {
                type: 'vascular-stent',
                domain: 'medical',
                generator: MedicalPatternGenerator.vascularStent,
                params: {
                    length: dims.get('length') || 25,
                    expandedDiameter: expandedDia,
                    collapsedDiameter: collapsedDia,
                    strutThickness: strutThick,
                    rings: ringCount,
                    bridges: bridgeCount
                }
            }
        }

        // LATTICE
        if (lower.includes('lattice') || lower.includes('gyroid')) {
            return {
                type: 'gyroid-lattice',
                domain: 'lattice',
                generator: OptimizedPatterns.gyroidLattice,
                params: {
                    size: dims.get('dim_x') || 50,
                    unitCellSize: 10.0,
                    thickness: 0.8,
                    porosity: 0.7
                }
            }
        }

        return null
    }

    private decomposeGeometry(nlpResult: any): any {
        const { shapes, operations, features, dimensions } = nlpResult

        const specialShape = this.detectSpecialShape(nlpResult.text, dimensions, features)
        if (specialShape) {
            return {
                root: specialShape,
                operations: [],
                features: features ? features.map((f: any) => ({
                    type: f.type,
                    params: f.params || this.inferFeatureParams(f.type, dimensions),
                    location: this.inferFeatureLocation(f)
                })) : [],
                isSpecial: true
            }
        }

        const geometryTree = {
            root: null as any,
            operations: [] as any[],
            features: [] as any[],
            isSpecial: false
        }

        if (shapes && shapes.length > 0) {
            const mainShape = shapes[0]
            geometryTree.root = {
                type: mainShape.type,
                params: this.inferParameters(mainShape.type, dimensions),
                confidence: mainShape.confidence
            }
        }

        if (shapes && shapes.length > 1) {
            for (let i = 1; i < shapes.length; i++) {
                const operation = this.inferOperation(shapes[i], operations)
                geometryTree.operations.push({
                    type: operation,
                    shape: shapes[i].type,
                    params: this.inferParameters(shapes[i].type, dimensions, i)
                })
            }
        }

        if (features) {
            geometryTree.features = features.map((f: any) => ({
                type: f.type,
                params: f.params || this.inferFeatureParams(f.type, dimensions),
                location: this.inferFeatureLocation(f)
            }))
        }

        return geometryTree
    }

    private detectSpecialShape(text: string, dimensions: any, features: any[]): any | null {
        const lower = text.toLowerCase()

        if (lower.includes('gear') || lower.includes('cog')) {
            const teeth = this.extractNumber(text, ['teeth', 'tooth']) || 12
            const radius = this.extractNumber(text, ['radius']) || dimensions.values?.[1] || 10
            const height = this.extractNumber(text, ['height', 'thickness']) || 5
            const holeFeature = features?.find((f: any) => f.type === 'hole')
            const centerHole = holeFeature?.params?.diameter || 0

            return {
                type: 'gear',
                params: { teeth, radius, height, centerHole },
                confidence: 0.95
            }
        }

        return null
    }

    private extractNumber(text: string, keywords: string[]): number | null {
        for (const keyword of keywords) {
            const pattern = new RegExp(`${keyword}[:\\s=]*(\\d+(?:\\.\\d+)?)`, 'i')
            const match = text.match(pattern)
            if (match) return parseFloat(match[1])
        }
        return null
    }

    private inferParameters(shapeType: string, dimensions: any, index: number = 0): any {
        const params: any = {}
        const dims = dimensions?.values || []

        switch (shapeType) {
            case 'box':
                params.width = dims[index * 3] || dimensions?.width || 50
                params.height = dims[index * 3 + 1] || dimensions?.height || 30
                params.depth = dims[index * 3 + 2] || dimensions?.depth || 20
                break
            case 'cylinder':
                params.radius = dimensions?.diameter ? dimensions.diameter / 2 : (dims[index * 2] || 10)
                params.height = dims[index * 2 + 1] || 50
                break
            case 'sphere':
                params.radius = dimensions?.diameter ? dimensions.diameter / 2 : (dims[index] || 10)
                break
        }

        return params
    }

    private inferOperation(shape: any, operations: string[]): string {
        const context = (shape.context || '').toLowerCase()
        if (context.includes('hole') || context.includes('cut')) return 'subtract'
        if (context.includes('add') || context.includes('combine')) return 'union'
        return 'union'
    }

    private inferFeatureParams(featureType: string, dimensions: any): any {
        return {}
    }

    private inferFeatureLocation(feature: any): string {
        return 'all'
    }

    private extractConstraints(nlpResult: any, decomposition: any): any {
        return {
            manufacturing: [],
            functional: [],
            dimensional: decomposition.constraints
        }
    }
}