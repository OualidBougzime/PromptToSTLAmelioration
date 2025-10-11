// server/nlp/hierarchical-parser.ts
export interface ParsedGeometry {
    mainComponent: {
        type: string
        confidence: number
    }
    dimensions: Map<string, number>
    features: any[]
    relationships: any[]
}

export class HierarchicalParser {
    parse(prompt: string): ParsedGeometry {
        const lower = prompt.toLowerCase()

        return {
            mainComponent: this.extractMainComponent(lower),
            dimensions: this.extractDimensions(prompt),
            features: this.extractFeatures(lower),
            relationships: this.extractRelationships(lower)
        }
    }

    private extractMainComponent(text: string): any {
        // Patterns de détection
        const patterns = [
            { regex: /gear|cog/i, type: 'gear', confidence: 0.9 },
            { regex: /stent/i, type: 'stent', confidence: 0.95 },
            { regex: /bracket/i, type: 'bracket', confidence: 0.85 },
            { regex: /box|cube/i, type: 'box', confidence: 0.8 }
        ]

        for (const pattern of patterns) {
            if (pattern.regex.test(text)) {
                return { type: pattern.type, confidence: pattern.confidence }
            }
        }

        return { type: 'unknown', confidence: 0.3 }
    }

    private extractDimensions(text: string): Map<string, number> {
        const dims = new Map<string, number>()

        // Patterns pour dimensions
        const lengthMatch = text.match(/length[:\s]*(\d+(?:\.\d+)?)/i)
        if (lengthMatch) dims.set('length', parseFloat(lengthMatch[1]))

        const diameterMatch = text.match(/diameter[:\s]*(\d+(?:\.\d+)?)/i)
        if (diameterMatch) dims.set('diameter', parseFloat(diameterMatch[1]))

        const widthMatch = text.match(/width[:\s]*(\d+(?:\.\d+)?)/i)
        if (widthMatch) dims.set('width', parseFloat(widthMatch[1]))

        return dims
    }

    private extractFeatures(text: string): any[] {
        const features = []

        if (text.includes('hole')) features.push({ type: 'hole' })
        if (text.includes('fillet')) features.push({ type: 'fillet' })
        if (text.includes('chamfer')) features.push({ type: 'chamfer' })

        return features
    }

    private extractRelationships(text: string): any[] {
        return [] // Simplified
    }
}