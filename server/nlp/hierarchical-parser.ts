export interface GeometricComponent {
    type: string
    params: Record<string, number | string>
    children: GeometricComponent[]
    spatialRelation: {
        position: 'main' | 'at_end' | 'inside' | 'on_surface' | 'around'
        anchor?: string
    }
    operation: 'create' | 'subtract' | 'pattern' | 'union'
}

export interface ParsedGeometry {
    mainComponent: GeometricComponent
    assembly: GeometricComponent[]
    dimensions: Map<string, number>
    features: string[]
    complexity: number
}

export class HierarchicalParser {
    parse(prompt: string): ParsedGeometry {
        const dimensions = this.extractDimensions(prompt)
        const mainComponent = this.identifyMainComponent(prompt)

        return {
            mainComponent,
            assembly: [mainComponent],
            dimensions,
            features: [],
            complexity: 5
        }
    }

    private identifyMainComponent(prompt: string): GeometricComponent {
        const lower = prompt.toLowerCase()

        if (lower.includes('drug') || lower.includes('capsule')) {
            return {
                type: 'drug-delivery-capsule', params: {}, children: [],
                spatialRelation: { position: 'main' }, operation: 'create'
            }
        }
        if (lower.includes('stent')) {
            return {
                type: 'stent', params: {}, children: [],
                spatialRelation: { position: 'main' }, operation: 'create'
            }
        }
        if (lower.includes('lattice') || lower.includes('gyroid')) {
            return {
                type: 'lattice', params: {}, children: [],
                spatialRelation: { position: 'main' }, operation: 'create'
            }
        }
        if (lower.includes('actuator')) {
            return {
                type: 'actuator', params: {}, children: [],
                spatialRelation: { position: 'main' }, operation: 'create'
            }
        }

        return {
            type: 'generic', params: {}, children: [],
            spatialRelation: { position: 'main' }, operation: 'create'
        }
    }

    private extractDimensions(prompt: string): Map<string, number> {
        const dims = new Map<string, number>()

        // Extraire longueur
        const lengthMatch = prompt.match(/(\d+(?:\.\d+)?)\s*mm\s+long/i)
        if (lengthMatch) dims.set('length', parseFloat(lengthMatch[1]))

        // Extraire diamètre
        const diameterMatch = prompt.match(/(\d+(?:\.\d+)?)\s*mm\s+diameter/i)
        if (diameterMatch) dims.set('diameter', parseFloat(diameterMatch[1]))

        // Extraire épaisseur
        const thicknessMatch = prompt.match(/thickness\s+(\d+(?:\.\d+)?)\s*mm/i)
        if (thicknessMatch) dims.set('thickness', parseFloat(thicknessMatch[1]))

        // Extraire dimensions X×Y×Z
        const dimMatch = prompt.match(/(\d+)\s*[xX×]\s*(\d+)\s*(?:[xX×]\s*(\d+))?/)
        if (dimMatch) {
            dims.set('dim_x', parseFloat(dimMatch[1]))
            dims.set('dim_y', parseFloat(dimMatch[2]))
            if (dimMatch[3]) dims.set('dim_z', parseFloat(dimMatch[3]))
        }

        return dims
    }
}