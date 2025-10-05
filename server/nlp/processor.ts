// server/nlp/processor.ts
export class NLPProcessor {
    async process(text: string): Promise<any> {
        // Analyse NLP simplifiée
        const words = text.toLowerCase().split(/\s+/)
        const tokens = this.tokenize(text)
        const entities = this.extractEntities(text)
        const intent = this.detectIntent(text)

        return {
            text,
            words,
            tokens,
            entities,
            intent,
            sentiment: this.analyzeSentiment(text)
        }
    }

    private tokenize(text: string): string[] {
        return text.match(/\b\w+\b/g) || []
    }

    private extractEntities(text: string): any {
        const entities = {
            numbers: text.match(/\d+(?:\.\d+)?/g) || [],
            units: text.match(/\b(mm|cm|m|inch|inches|ft|feet)\b/gi) || [],
            materials: text.match(/\b(steel|aluminum|plastic|wood|titanium|carbon)\b/gi) || [],
            colors: text.match(/\b(red|blue|green|yellow|black|white|gray)\b/gi) || [],
            actions: text.match(/\b(create|make|design|build|generate|construct)\b/gi) || []
        }
        return entities
    }

    private detectIntent(text: string): string {
        const lower = text.toLowerCase()
        if (lower.includes('create') || lower.includes('make')) return 'create'
        if (lower.includes('modify') || lower.includes('change')) return 'modify'
        if (lower.includes('analyze') || lower.includes('check')) return 'analyze'
        if (lower.includes('optimize') || lower.includes('improve')) return 'optimize'
        return 'create'
    }

    private analyzeSentiment(text: string): number {
        // Sentiment simple : 0 (négatif) à 1 (positif)
        const positiveWords = ['good', 'great', 'excellent', 'perfect', 'best']
        const negativeWords = ['bad', 'poor', 'worst', 'terrible', 'awful']

        let score = 0.5
        const lower = text.toLowerCase()

        positiveWords.forEach(word => {
            if (lower.includes(word)) score += 0.1
        })

        negativeWords.forEach(word => {
            if (lower.includes(word)) score -= 0.1
        })

        return Math.max(0, Math.min(1, score))
    }
}