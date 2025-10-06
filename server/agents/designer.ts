// server/agents/designer.ts - AGENT DESIGNER
import { EventEmitter } from 'events'

export class DesignerAgent extends EventEmitter {
    async design(analysis: any, context: any): Promise<any> {
        this.emit('state', { status: 'designing', progress: 0 })

        // 1. Créer le concept de design
        const concept = this.createConcept(analysis)
        this.emit('state', { status: 'designing', progress: 30 })

        // 2. Définir les paramètres
        const parameters = this.defineParameters(analysis.geometry)
        this.emit('state', { status: 'designing', progress: 60 })

        // 3. Sélectionner les matériaux
        const materials = this.selectMaterials(analysis)
        this.emit('state', { status: 'designing', progress: 90 })

        const design = {
            concept,
            parameters,
            materials,
            approach: this.selectApproach(analysis.complexity),
            features: this.extractFeatures(analysis.geometry)
        }

        this.emit('state', { status: 'complete', progress: 100 })
        return design
    }

    private createConcept(analysis: any): any {
        const { geometry } = analysis

        return {
            type: this.determineType(geometry),
            mainBody: {
                type: 'primitive-based',
                primitive: geometry.root?.type || 'box',
                operations: geometry.operations.map(op => ({
                    type: op.type,
                    shape: op.shape
                }))
            },
            features: geometry.features.map(f => ({
                type: f.type,
                location: f.location,
                purpose: this.inferPurpose(f.type)
            }))
        }
    }

    private determineType(geometry: any): string {
        const hasOperations = geometry.operations.length > 0
        const hasFeatures = geometry.features.length > 0

        if (hasOperations && hasFeatures) return 'complex-assembly'
        if (hasOperations) return 'boolean-operations'
        if (hasFeatures) return 'featured-part'
        return 'simple-part'
    }

    private inferPurpose(featureType: string): string {
        const purposes: Record<string, string> = {
            'fillet': 'stress-reduction',
            'chamfer': 'ease-of-assembly',
            'hole': 'fastening',
            'thread': 'mechanical-connection',
            'pattern': 'weight-reduction'
        }
        return purposes[featureType] || 'functional'
    }

    private defineParameters(geometry: any): any {
        const params: any = {}

        if (geometry.root) {
            Object.assign(params, geometry.root.params)
        }

        // Ajouter des paramètres dérivés
        if (params.width && params.height && params.depth) {
            params.volume = params.width * params.height * params.depth
        }

        if (params.radius && params.height) {
            params.volume = Math.PI * params.radius ** 2 * params.height
        }

        return params
    }

    private selectMaterials(analysis: any): any {
        const materials: any = {
            primary: 'pla',
            alternatives: ['abs', 'petg']
        }

        // Adapter selon le domaine
        if (analysis.domain?.category === 'mechanical') {
            materials.primary = 'aluminum'
            materials.alternatives = ['steel', 'titanium']
        }

        if (analysis.domain?.category === 'medical') {
            materials.primary = 'titanium'
            materials.alternatives = ['stainless-steel', 'peek']
        }

        return materials
    }

    private selectApproach(complexity: any): string {
        if (complexity.score < 3) return 'direct'
        if (complexity.score < 6) return 'iterative'
        return 'hierarchical'
    }

    private extractFeatures(geometry: any): any[] {
        return geometry.features.map((f: any) => ({
            type: f.type,
            params: f.params,
            location: f.location,
            priority: this.calculatePriority(f.type)
        }))
    }

    private calculatePriority(featureType: string): number {
        const priorities: Record<string, number> = {
            'hole': 10,
            'thread': 9,
            'fillet': 5,
            'chamfer': 5,
            'pattern': 3
        }
        return priorities[featureType] || 1
    }
}