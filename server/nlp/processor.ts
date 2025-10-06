// server/nlp/processor.ts - VERSION AMÉLIORÉE
export class NLPProcessor {
    // Dictionnaire de formes avec synonymes
    private shapeKeywords = {
        'box': ['box', 'cube', 'rectangular', 'block', 'case'],
        'cylinder': ['cylinder', 'tube', 'pipe', 'round', 'cylindrical'],
        'sphere': ['sphere', 'ball', 'round', 'spherical'],
        'cone': ['cone', 'conical', 'pyramid', 'pyramidal'],
        'torus': ['torus', 'donut', 'ring'],
        'prism': ['prism', 'prismatic']
    }

    // Opérations booléennes
    private operations = {
        'union': ['combine', 'merge', 'union', 'add', 'join'],
        'subtract': ['subtract', 'remove', 'cut', 'hole', 'hollow'],
        'intersect': ['intersect', 'overlap', 'common']
    }

    // Features communes
    private features = {
        'fillet': ['fillet', 'round', 'rounded', 'smooth edges'],
        'chamfer': ['chamfer', 'beveled', 'angled edge'],
        'hole': ['hole', 'opening', 'perforation', 'through-hole'],
        'thread': ['thread', 'threaded', 'screw'],
        'pattern': ['pattern', 'array', 'grid', 'repeated']
    }

    async process(text: string): Promise<any> {
        const lower = text.toLowerCase()

        return {
            // Analyse basique
            text,
            tokens: this.tokenize(text),

            // Extraction intelligente
            shapes: this.detectShapes(lower),
            operations: this.detectOperations(lower),
            features: this.detectFeatures(lower),
            dimensions: this.extractDimensions(text),

            // Relations
            relationships: this.extractRelationships(lower),

            // Contexte
            intent: this.detectIntent(text),
            complexity: this.calculateComplexity(lower)
        }
    }

    private detectShapes(text: string): Array<{ type: string, confidence: number, context: string }> {
        const shapes: any[] = []

        for (const [shapeType, keywords] of Object.entries(this.shapeKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    const context = this.extractContext(text, keyword)
                    shapes.push({
                        type: shapeType,
                        confidence: this.calculateConfidence(text, keyword),
                        context,
                        position: text.indexOf(keyword)
                    })
                }
            }
        }

        // Trier par confiance
        return shapes.sort((a, b) => b.confidence - a.confidence)
    }

    private detectOperations(text: string): string[] {
        const detected: string[] = []

        for (const [operation, keywords] of Object.entries(this.operations)) {
            if (keywords.some(kw => text.includes(kw))) {
                detected.push(operation)
            }
        }

        return detected
    }

    private detectFeatures(text: string): Array<{ type: string, params: any }> {
        const features: any[] = []

        for (const [featureType, keywords] of Object.entries(this.features)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    features.push({
                        type: featureType,
                        params: this.extractFeatureParams(text, featureType),
                        context: this.extractContext(text, keyword)
                    })
                }
            }
        }

        return features
    }

    private extractDimensions(text: string): any {
        const dimensions: any = {}

        // Pattern pour les dimensions : "50mm", "5cm", "10x20x30"
        const patterns = {
            single: /(\d+(?:\.\d+)?)\s*(mm|cm|m|inch|inches)?/gi,
            triple: /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/gi,
            diameter: /(?:diameter|radius|dia|rad)[:\s]*(\d+(?:\.\d+)?)/gi
        }

        // Extraire dimensions multiples (ex: "10x20x30")
        const tripleMatch = text.match(patterns.triple)
        if (tripleMatch) {
            const nums = tripleMatch[0].match(/\d+(?:\.\d+)?/g)
            if (nums && nums.length === 3) {
                dimensions.width = parseFloat(nums[0])
                dimensions.height = parseFloat(nums[1])
                dimensions.depth = parseFloat(nums[2])
            }
        }

        // Extraire diamètre/rayon
        const diaMatch = text.match(patterns.diameter)
        if (diaMatch) {
            const num = diaMatch[0].match(/\d+(?:\.\d+)?/)
            if (num) {
                dimensions.diameter = parseFloat(num[0])
            }
        }

        // Extraire toutes les valeurs numériques
        const allNumbers = text.match(/\d+(?:\.\d+)?/g)
        if (allNumbers) {
            dimensions.values = allNumbers.map(n => parseFloat(n))
        }

        return dimensions
    }

    private extractRelationships(text: string): any[] {
        const relationships: any[] = []

        // Détection de relations spatiales
        const spatialKeywords = {
            'on': ['on', 'on top of', 'above'],
            'inside': ['inside', 'within', 'contained in'],
            'connected': ['connected to', 'attached to', 'joined to'],
            'center': ['centered', 'centered on', 'in the middle']
        }

        for (const [relation, keywords] of Object.entries(spatialKeywords)) {
            if (keywords.some(kw => text.includes(kw))) {
                relationships.push({ type: relation, context: text })
            }
        }

        return relationships
    }

    private extractContext(text: string, keyword: string): string {
        const index = text.indexOf(keyword)
        const start = Math.max(0, index - 30)
        const end = Math.min(text.length, index + keyword.length + 30)
        return text.substring(start, end)
    }

    private calculateConfidence(text: string, keyword: string): number {
        // Plus le mot-clé est spécifique, plus la confiance est haute
        const wordCount = text.split(/\s+/).length
        const specificityBonus = keyword.length / 10
        const frequencyPenalty = (text.match(new RegExp(keyword, 'gi')) || []).length > 1 ? 0.8 : 1

        return Math.min(1, (0.5 + specificityBonus) * frequencyPenalty)
    }

    private extractFeatureParams(text: string, featureType: string): any {
        const params: any = {}

        switch (featureType) {
            case 'fillet':
            case 'chamfer':
                // Chercher un rayon
                const radiusMatch = text.match(/radius[:\s]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*radius/i)
                if (radiusMatch) {
                    params.radius = parseFloat(radiusMatch[1] || radiusMatch[2])
                }
                break

            case 'hole':
                // Chercher diamètre et profondeur
                const diaMatch = text.match(/diameter[:\s]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*diameter/i)
                if (diaMatch) {
                    params.diameter = parseFloat(diaMatch[1] || diaMatch[2])
                }
                break
        }

        return params
    }

    private calculateComplexity(text: string): number {
        let complexity = 0

        // +1 par forme détectée
        complexity += (text.match(/box|cylinder|sphere|cone/gi) || []).length

        // +2 par opération booléenne
        complexity += (text.match(/subtract|union|cut|hole/gi) || []).length * 2

        // +1.5 par feature
        complexity += (text.match(/fillet|chamfer|thread|pattern/gi) || []).length * 1.5

        return Math.min(10, complexity)
    }

    private tokenize(text: string): string[] {
        return text.match(/\b\w+\b/g) || []
    }

    private detectIntent(text: string): string {
        const lower = text.toLowerCase()
        if (lower.includes('create') || lower.includes('make')) return 'create'
        if (lower.includes('modify') || lower.includes('change')) return 'modify'
        return 'create'
    }
}