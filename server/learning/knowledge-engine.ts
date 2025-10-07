// server/learning/knowledge-engine.ts
export class KnowledgeEngine {
    private patterns: Map<string, any> = new Map()
    private successfulGenerations: any[] = []

    async learn(prompt: string, result: any, feedback: any) {
        // Stocker les générations réussies
        if (result.validation?.score > 80) {
            this.successfulGenerations.push({
                prompt,
                code: result.code,
                params: result.parameters,
                timestamp: Date.now(),
                feedback
            })

            // Créer un pattern réutilisable
            const pattern = this.extractPattern(prompt, result)
            if (pattern) {
                this.patterns.set(pattern.signature, pattern)
                console.log(`📚 New pattern learned: ${pattern.name}`)
            }
        }
    }

    async findSimilar(prompt: string): Promise<any[]> {
        // Recherche sémantique dans les générations passées
        const similar = this.successfulGenerations
            .map(gen => ({
                ...gen,
                similarity: this.calculateSimilarity(prompt, gen.prompt)
            }))
            .filter(gen => gen.similarity > 0.6)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5)

        return similar
    }

    private calculateSimilarity(prompt1: string, prompt2: string): number {
        // Implémentation simple avec Jaccard similarity
        const words1 = new Set(prompt1.toLowerCase().split(/\s+/))
        const words2 = new Set(prompt2.toLowerCase().split(/\s+/))

        const intersection = new Set([...words1].filter(w => words2.has(w)))
        const union = new Set([...words1, ...words2])

        return intersection.size / union.size
    }

    private extractPattern(prompt: string, result: any): any | null {
        // Extraire un pattern générique du résultat
        // À implémenter selon votre logique métier
        return null
    }
}