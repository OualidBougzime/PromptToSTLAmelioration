// server/agents/analyzer.ts - Agent Analyseur
import { EventEmitter } from 'events'
import { NLPProcessor } from '../nlp/processor'
import { DomainClassifier } from '../ml/classifier'

export class AnalyzerAgent extends EventEmitter {
    private nlp = new NLPProcessor()
    private classifier = new DomainClassifier()

    async analyze(prompt: string, context: any): Promise<any> {
        this.emit('state', { status: 'analyzing', progress: 0 })

        // 1. Analyse NLP du prompt
        const nlpAnalysis = await this.nlp.process(prompt)
        this.emit('state', { status: 'analyzing', progress: 25 })

        // 2. Classification du domaine
        const domain = await this.classifier.classify(prompt)
        this.emit('state', { status: 'analyzing', progress: 50 })

        // 3. Extraction des entités
        const entities = this.extractEntities(nlpAnalysis)
        this.emit('state', { status: 'analyzing', progress: 75 })

        // 4. Détection des contraintes
        const constraints = this.detectConstraints(prompt, nlpAnalysis)

        // 5. Évaluation de la complexité
        const complexity = this.evaluateComplexity(entities, constraints)

        this.emit('state', { status: 'complete', progress: 100 })

        return {
            intent: nlpAnalysis.intent,
            domain: domain.category,
            confidence: domain.confidence,
            entities,
            constraints,
            complexity,
            parameters: this.extractParameters(entities),
            features: this.identifyFeatures(nlpAnalysis),
            references: this.findReferences(prompt)
        }
    }

    private extractEntities(analysis: any): any {
        const entities = {
            objects: [],
            dimensions: [],
            materials: [],
            operations: [],
            properties: []
        }

        // Extraction des objets (gear, bracket, housing, etc.)
        const objectPatterns = [
            /(?:create|make|design|build)\s+(?:a|an)?\s*(\w+)/gi,
            /(\w+)\s+with\s+/gi,
            /(\w+)\s+(?:that|which)\s+/gi
        ]

        // Extraction des dimensions
        const dimensionPatterns = [
            /(\d+(?:\.\d+)?)\s*(?:mm|cm|m|inch|inches|ft|feet)/gi,
            /(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/gi,
            /diameter\s+(?:of\s+)?(\d+)/gi,
            /radius\s+(?:of\s+)?(\d+)/gi
        ]

        // Extraction des matériaux
        const materialPatterns = [
            /(?:in|from|using|with)\s+(steel|aluminum|plastic|wood|titanium|carbon fiber)/gi,
            /(\w+)\s+material/gi
        ]

        // Appliquer les patterns
        for (const pattern of objectPatterns) {
            const matches = [...analysis.text.matchAll(pattern)]
            entities.objects.push(...matches.map(m => m[1]))
        }

        for (const pattern of dimensionPatterns) {
            const matches = [...analysis.text.matchAll(pattern)]
            entities.dimensions.push(...matches.map(m => ({
                value: parseFloat(m[1]),
                unit: m[2] || 'mm',
                context: m[0]
            })))
        }

        return entities
    }

    private detectConstraints(prompt: string, analysis: any): any {
        const constraints = {
            geometric: [],
            manufacturing: [],
            functional: [],
            aesthetic: []
        }

        // Contraintes géométriques
        if (prompt.includes('parallel')) constraints.geometric.push('parallel')
        if (prompt.includes('perpendicular')) constraints.geometric.push('perpendicular')
        if (prompt.includes('concentric')) constraints.geometric.push('concentric')
        if (prompt.includes('tangent')) constraints.geometric.push('tangent')

        // Contraintes de fabrication
        if (prompt.match(/3d print/i)) constraints.manufacturing.push('3d-printable')
        if (prompt.match(/cnc|machin/i)) constraints.manufacturing.push('machinable')
        if (prompt.match(/inject|mold/i)) constraints.manufacturing.push('injection-moldable')

        // Contraintes fonctionnelles
        if (prompt.match(/support.*kg|weight/i)) {
            const match = prompt.match(/(\d+)\s*kg/i)
            constraints.functional.push({
                type: 'load-bearing',
                value: match ? parseFloat(match[1]) : null
            })
        }

        return constraints
    }

    private evaluateComplexity(entities: any, constraints: any): number {
        let complexity = 0.3 // Base

        // Plus d'objets = plus complexe
        complexity += entities.objects.length * 0.1

        // Plus de dimensions = plus de précision requise
        complexity += entities.dimensions.length * 0.05

        // Contraintes augmentent la complexité
        complexity += constraints.geometric.length * 0.1
        complexity += constraints.manufacturing.length * 0.15
        complexity += constraints.functional.length * 0.2

        // Matériaux spéciaux
        if (entities.materials.some(m => ['titanium', 'carbon fiber'].includes(m))) {
            complexity += 0.2
        }

        return Math.min(1, complexity)
    }

    private extractParameters(entities: any): any {
        const params = {}

        // Convertir les dimensions en paramètres
        entities.dimensions.forEach((dim, idx) => {
            const name = dim.context.includes('diameter') ? 'diameter' :
                dim.context.includes('radius') ? 'radius' :
                    dim.context.includes('height') ? 'height' :
                        dim.context.includes('width') ? 'width' :
                            dim.context.includes('length') ? 'length' :
                                `dimension${idx + 1}`

            params[name] = {
                value: dim.value,
                unit: dim.unit,
                min: dim.value * 0.5,
                max: dim.value * 2,
                step: dim.value > 10 ? 1 : 0.1
            }
        })

        return params
    }

    private identifyFeatures(analysis: any): string[] {
        const features = []

        const featureKeywords = {
            'holes': ['hole', 'mounting', 'bore'],
            'threads': ['thread', 'screw', 'tap'],
            'chamfers': ['chamfer', 'bevel'],
            'fillets': ['fillet', 'round', 'radius'],
            'patterns': ['pattern', 'array', 'repeat'],
            'ribs': ['rib', 'reinforce', 'strengthen'],
            'pockets': ['pocket', 'cavity', 'hollow'],
            'slots': ['slot', 'groove', 'channel']
        }

        for (const [feature, keywords] of Object.entries(featureKeywords)) {
            if (keywords.some(kw => analysis.text.toLowerCase().includes(kw))) {
                features.push(feature)
            }
        }

        return features
    }

    private findReferences(prompt: string): any[] {
        const references = []

        // Détecter les URLs
        const urlPattern = /https?:\/\/[^\s]+/gi
        const urls = prompt.match(urlPattern)
        if (urls) {
            references.push(...urls.map(url => ({ type: 'url', value: url })))
        }

        // Détecter les normes
        const standardPattern = /(?:ISO|DIN|ANSI|ASME)\s*\d+/gi
        const standards = prompt.match(standardPattern)
        if (standards) {
            references.push(...standards.map(std => ({ type: 'standard', value: std })))
        }

        return references
    }

    receiveMessage(msg: any): void {
        // Traiter les messages d'autres agents
        this.emit('message', {
            to: msg.from,
            type: 'response',
            content: { acknowledged: true }
        })
    }
}