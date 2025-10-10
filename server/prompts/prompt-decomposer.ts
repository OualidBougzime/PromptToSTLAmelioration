// server/prompts/prompt-decomposer.ts
/**
 * Décompose les prompts très complexes en sous-tâches
 */
export class PromptDecomposer {

    /**
     * Analyser la complexité d'un prompt
     */
    static analyzeComplexity(prompt: string): {
        score: number
        factors: any
        shouldDecompose: boolean
    } {
        let score = 0
        const factors: any = {}

        // Compter les mots
        factors.wordCount = prompt.split(/\s+/).length
        score += Math.min(factors.wordCount / 10, 3)

        // Compter les dimensions
        factors.dimensionCount = (prompt.match(/\d+(?:\.\d+)?\s*mm/g) || []).length
        score += factors.dimensionCount * 0.5

        // Compter les features
        const features = ['chamber', 'hole', 'slot', 'groove', 'ridge', 'tab', 'port', 'hinge', 'flexure']
        factors.featureCount = features.filter(f => prompt.toLowerCase().includes(f)).length
        score += factors.featureCount

        // Compter les adjectifs de complexité
        const complexWords = ['adaptive', 'programmable', 'adjustable', 'gradient', 'optimized', 'interconnected']
        factors.complexityWords = complexWords.filter(w => prompt.toLowerCase().includes(w)).length
        score += factors.complexityWords * 2

        return {
            score: Math.min(score, 10),
            factors,
            shouldDecompose: score > 7
        }
    }

    /**
     * Décomposer un prompt complexe
     */
    static decompose(prompt: string): {
        mainShape: string
        features: string[]
        simplifiedPrompt: string
    } {
        const lower = prompt.toLowerCase()

        // Extraire forme principale
        const mainShape = this.extractMainShape(prompt)

        // Extraire features
        const features = this.extractFeatures(prompt)

        // Créer prompt simplifié
        const simplifiedPrompt = `Create a ${mainShape} with basic structure. ${features.length > 0 ? 'Add: ' + features.slice(0, 2).join(', ') : ''}`

        return {
            mainShape,
            features,
            simplifiedPrompt
        }
    }

    /**
     * Extraire la forme principale
     */
    private static extractMainShape(prompt: string): string {
        const lower = prompt.toLowerCase()

        // Patterns de formes
        const shapePatterns = [
            { pattern: /stent/i, shape: 'tubular mesh stent' },
            { pattern: /actuator.*body.*(\d+)mm x (\d+)mm/i, shape: 'rectangular actuator body' },
            { pattern: /splint/i, shape: 'curved splint' },
            { pattern: /gripper/i, shape: 'compliant gripper' },
            { pattern: /scaffold/i, shape: 'porous scaffold' },
            { pattern: /chip/i, shape: 'microfluidic chip' }
        ]

        for (const { pattern, shape } of shapePatterns) {
            if (pattern.test(lower)) return shape
        }

        return 'basic structure'
    }

    /**
     * Extraire les features
     */
    private static extractFeatures(prompt: string): string[] {
        const features: string[] = []
        const lower = prompt.toLowerCase()

        const featurePatterns = [
            { pattern: /chamber/i, feature: 'chambers' },
            { pattern: /hole/i, feature: 'holes' },
            { pattern: /ventilat/i, feature: 'ventilation' },
            { pattern: /strap/i, feature: 'strap slots' },
            { pattern: /mount/i, feature: 'mounting points' },
            { pattern: /port/i, feature: 'ports' },
            { pattern: /hinge/i, feature: 'hinges' },
            { pattern: /flare/i, feature: 'flared ends' }
        ]

        for (const { pattern, feature } of featurePatterns) {
            if (pattern.test(lower)) {
                features.push(feature)
            }
        }

        return features
    }
}