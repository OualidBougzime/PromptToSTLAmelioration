// server/agents/analyzer.ts - ANALYSEUR GÉOMÉTRIQUE COMPLET
import { EventEmitter } from 'events'
import { NLPProcessor } from '../nlp/processor'
import { DomainClassifier } from '../ml/classifier'
import { AdvancedNLPProcessor } from '../nlp/advanced-processor'

export class AnalyzerAgent extends EventEmitter {
    private nlp: NLPProcessor
    private advancedNlp: AdvancedNLPProcessor  // 🔥 NOUVEAU
    private classifier: DomainClassifier

    constructor() {
        super()
        this.nlp = new NLPProcessor()
        this.advancedNlp = new AdvancedNLPProcessor()  // 🔥 NOUVEAU
        this.classifier = new DomainClassifier()
    }

    async analyze(prompt: string, context: any = {}): Promise<any> {
        this.emit('state', { status: 'analyzing', progress: 0 })

        // 🔥 1. Essayer d'abord le pattern matching avancé
        const advancedPattern = await this.advancedNlp.detectPattern(prompt)
        if (advancedPattern) {
            console.log('✅ Advanced pattern matched:', advancedPattern.type)

            return {
                prompt,
                pattern: advancedPattern,
                isAdvancedPattern: true,  // 🔥 FLAG
                domain: await this.classifier.classify(prompt),
                complexity: { level: 'advanced', score: 7 }
            }
        }

        // 2. Sinon, utiliser le NLP classique
        const nlpResult = await this.nlp.process(prompt)
        console.log('📊 NLP Result:', JSON.stringify(nlpResult, null, 2)) // ✅ AJOUT
        this.emit('state', { status: 'analyzing', progress: 25 })

        // 2. Classification du domaine
        const domain = await this.classifier.classify(prompt)
        console.log('📊 Domain:', domain) // ✅ AJOUT
        this.emit('state', { status: 'analyzing', progress: 50 })

        // 3. Décomposition géométrique
        const geometry = this.decomposeGeometry(nlpResult)
        console.log('📊 Geometry:', JSON.stringify(geometry, null, 2)) // ✅ AJOUT
        this.emit('state', { status: 'analyzing', progress: 75 })

        // 4. Analyse des contraintes
        const constraints = this.extractConstraints(nlpResult, geometry)
        this.emit('state', { status: 'analyzing', progress: 90 })

        const result = {
            prompt,
            nlp: nlpResult,
            domain,
            geometry,
            constraints,
            complexity: this.assessComplexity(geometry, constraints),
            recommendations: this.generateRecommendations(geometry, domain)
        }

        this.emit('state', { status: 'complete', progress: 100 })
        return result
    }

    private decomposeGeometry(nlpResult: any): any {
        const { shapes, operations, features, dimensions } = nlpResult

        // 🔥 VÉRIFIE D'ABORD LES FORMES SPÉCIALES
        const specialShape = this.detectSpecialShape(nlpResult.text, dimensions, features)
        if (specialShape) {
            console.log('🎯 Special shape detected:', specialShape)
            return {
                root: specialShape,
                operations: [],
                features: features.map(f => ({
                    type: f.type,
                    params: f.params || this.inferFeatureParams(f.type, dimensions),
                    location: this.inferFeatureLocation(f)
                })),
                isSpecial: true
            }
        }

        // Sinon, construire l'arbre géométrique normal
        const geometryTree = {
            root: null as any,
            operations: [] as any[],
            features: [] as any[],
            isSpecial: false
        }

        // 1. Identifier la forme principale
        if (shapes.length > 0) {
            const mainShape = shapes[0]
            geometryTree.root = {
                type: mainShape.type,
                params: this.inferParameters(mainShape.type, dimensions),
                confidence: mainShape.confidence
            }
        }

        // 2. Identifier les opérations secondaires
        if (shapes.length > 1) {
            for (let i = 1; i < shapes.length; i++) {
                const operation = this.inferOperation(shapes[i], operations)
                geometryTree.operations.push({
                    type: operation,
                    shape: shapes[i].type,
                    params: this.inferParameters(shapes[i].type, dimensions, i)
                })
            }
        }

        // 3. Ajouter les features
        geometryTree.features = features.map(f => ({
            type: f.type,
            params: f.params || this.inferFeatureParams(f.type, dimensions),
            location: this.inferFeatureLocation(f)
        }))

        return geometryTree
    }

    private detectSpecialShape(text: string, dimensions: any, features: any[]): any | null {
        const lower = text.toLowerCase()

        // Détecter GEAR
        if (lower.includes('gear') || lower.includes('cog') || lower.includes('sprocket')) {
            const teeth = this.extractNumber(text, ['teeth', 'tooth']) || 12
            const radius = this.extractNumber(text, ['radius']) || dimensions.values?.[1] || 10
            const height = this.extractNumber(text, ['height', 'thickness']) || 5

            // Chercher le trou central dans les features
            const holeFeature = features.find(f => f.type === 'hole')
            const centerHole = holeFeature?.params?.diameter || 0

            console.log(`🎯 Gear params extracted: teeth=${teeth}, radius=${radius}, height=${height}, centerHole=${centerHole}`)

            return {
                type: 'gear',
                params: { teeth, radius, height, centerHole },
                confidence: 0.95
            }
        }

        // Détecter BRACKET
        if (lower.includes('bracket') || lower.includes('mount')) {
            return {
                type: 'bracket',
                params: this.inferBracketParams(text, dimensions),
                confidence: 0.85
            }
        }

        // Détecter SPRING
        if (lower.includes('spring') || lower.includes('coil')) {
            return {
                type: 'spring',
                params: this.inferSpringParams(text, dimensions),
                confidence: 0.85
            }
        }

        return null
    }

    private inferSpringParams(text: string, dimensions: any): any {
        const values = dimensions.values || []
        return {
            diameter: values[0] || 10,
            wireDiameter: values[1] || 2,
            coils: values[2] || 10,
            height: values[3] || 50
        }
    }

    private inferBracketParams(text: string, dimensions: any): any {
        const values = dimensions.values || []
        return {
            baseWidth: values[0] || 50,
            baseDepth: values[1] || 30,
            baseHeight: values[2] || 5,
            wallHeight: values[3] || 40,
            wallThickness: values[4] || 5
        }
    }

    private extractNumber(text: string, keywords: string[]): number | null {
        for (const keyword of keywords) {
            // Cherche "keyword 10" ou "keyword: 10" ou "keyword = 10"
            const pattern = new RegExp(`${keyword}[:\\s=]*(\\d+(?:\\.\\d+)?)`, 'i')
            const match = text.match(pattern)
            if (match) {
                console.log(`📊 Found ${keyword}: ${match[1]}`)
                return parseFloat(match[1])
            }
        }

        // Cherche aussi "10 teeth" ou "12 teeth"
        for (const keyword of keywords) {
            const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${keyword}`, 'i')
            const match = text.match(pattern)
            if (match) {
                console.log(`📊 Found ${keyword}: ${match[1]}`)
                return parseFloat(match[1])
            }
        }

        return null
    }

    private inferParameters(shapeType: string, dimensions: any, index: number = 0): any {
        const params: any = {}
        const dims = dimensions.values || []

        switch (shapeType) {
            case 'box':
                params.width = dims[index * 3] || dimensions.width || 10
                params.height = dims[index * 3 + 1] || dimensions.height || 10
                params.depth = dims[index * 3 + 2] || dimensions.depth || 10
                break

            case 'cylinder':
                params.radius = dimensions.diameter ? dimensions.diameter / 2 : (dims[index * 2] || 5)
                params.height = dims[index * 2 + 1] || 10
                break

            case 'sphere':
                params.radius = dimensions.diameter ? dimensions.diameter / 2 : (dims[index] || 5)
                break

            case 'cone':
                params.radius = dims[index * 2] || 5
                params.height = dims[index * 2 + 1] || 10
                break

            case 'torus':
                params.majorRadius = dims[index * 2] || 10
                params.minorRadius = dims[index * 2 + 1] || 2
                break
        }

        return params
    }

    private inferOperation(shape: any, operations: string[]): string {
        const context = (shape.context || '').toLowerCase()

        // Chercher des indices dans le contexte
        if (context.includes('hole') || context.includes('cut') ||
            context.includes('subtract') || context.includes('remove')) {
            return 'subtract'
        }

        if (context.includes('add') || context.includes('combine') ||
            context.includes('merge') || context.includes('union')) {
            return 'union'
        }

        if (context.includes('intersect') || context.includes('overlap')) {
            return 'intersect'
        }

        // Si plusieurs formes détectées → union par défaut
        return 'union'
    }

    private inferFeatureParams(featureType: string, dimensions: any): any {
        const params: any = {}
        const dims = dimensions.values || []

        switch (featureType) {
            case 'fillet':
            case 'chamfer':
                params.radius = dims.find(d => d < 5) || 1
                break

            case 'hole':
                params.diameter = dims.find(d => d < 10) || 3
                params.depth = dims.find(d => d > 5) || 10
                break

            case 'thread':
                params.pitch = 1.5
                params.diameter = dims.find(d => d < 20) || 6
                break
        }

        return params
    }

    private inferFeatureLocation(feature: any): string {
        const context = feature.context?.toLowerCase() || ''

        if (context.includes('top') || context.includes('above')) return 'top'
        if (context.includes('bottom') || context.includes('below')) return 'bottom'
        if (context.includes('side')) return 'side'
        if (context.includes('center') || context.includes('middle')) return 'center'

        return 'all' // Par défaut, partout
    }

    private extractConstraints(nlpResult: any, geometry: any): any {
        const constraints: any = {
            manufacturing: [],
            functional: [],
            dimensional: []
        }

        // Contraintes de fabrication
        if (nlpResult.text.toLowerCase().includes('3d print')) {
            constraints.manufacturing.push({
                type: 'additive',
                method: '3d-printing',
                minWallThickness: 1.5,
                maxOverhang: 45
            })
        }

        // Contraintes dimensionnelles
        if (nlpResult.dimensions.values) {
            constraints.dimensional.push({
                type: 'explicit',
                values: nlpResult.dimensions
            })
        }

        // Contraintes fonctionnelles
        if (nlpResult.features.some(f => f.type === 'thread')) {
            constraints.functional.push({
                type: 'mechanical',
                feature: 'threading',
                standard: 'ISO'
            })
        }

        return constraints
    }

    private assessComplexity(geometry: any, constraints: any): any {
        let score = 1 // Base

        // +1 par forme
        score += geometry.root ? 1 : 0
        score += geometry.operations.length

        // +2 par feature
        score += geometry.features.length * 2

        // +1 par contrainte
        score += Object.values(constraints).flat().length

        return {
            score: Math.min(10, score),
            level: score < 3 ? 'simple' : score < 6 ? 'medium' : 'complex',
            factors: {
                shapes: geometry.operations.length + 1,
                features: geometry.features.length,
                constraints: Object.values(constraints).flat().length
            }
        }
    }

    private generateRecommendations(geometry: any, domain: any): string[] {
        const recommendations: string[] = []

        // Recommandations basées sur le domaine
        if (domain.category === 'mechanical') {
            recommendations.push('Consider adding fillets to reduce stress concentration')
            recommendations.push('Verify tolerance requirements for assembly')
        }

        // Recommandations basées sur la géométrie
        if (geometry.features.length === 0) {
            recommendations.push('Consider adding features like fillets or chamfers')
        }

        if (geometry.operations.some(op => op.type === 'subtract')) {
            recommendations.push('Ensure proper wall thickness after subtraction')
        }

        return recommendations
    }
}