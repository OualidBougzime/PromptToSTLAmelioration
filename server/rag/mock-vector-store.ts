// server/rag/mock-vector-store.ts
// Fallback pour développement sans Qdrant

interface Example {
    id: string
    prompt: string
    code: string
    geometricPattern: string
    constraints: string[]
    complexity: number
}

export class MockVectorStore {
    private examples: Map<string, Example> = new Map()

    constructor() {
        console.log('⚠️ Using MOCK Vector Store (Qdrant not available)')
    }

    async createCollection(): Promise<void> {
        console.log('✅ Mock collection created')
    }

    async addExample(example: Example): Promise<void> {
        this.examples.set(example.id, example)
    }

    async search(query: string, topK: number = 3): Promise<any[]> {
        const lower = query.toLowerCase()
        const results: any[] = []

        this.examples.forEach((example) => {
            const promptLower = example.prompt.toLowerCase()
            const codeLower = example.code.toLowerCase()

            // Simple keyword matching
            const words = lower.split(/\s+/).filter(w => w.length > 2)
            let matchCount = 0

            words.forEach(word => {
                if (promptLower.includes(word)) matchCount += 2 // Prompt matches worth more
                if (codeLower.includes(word)) matchCount += 1
                if (example.geometricPattern.includes(word)) matchCount += 3
            })

            if (matchCount > 0) {
                results.push({
                    ...example,
                    score: Math.min(matchCount / (words.length * 2), 1.0)
                })
            }
        })

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
    }

    async populateWithExamples(): Promise<void> {
        const examples: Example[] = [
            {
                id: 'gear-mock-1',
                prompt: 'Create a gear with teeth',
                code: 'import cadquery as cq\n# Gear implementation',
                geometricPattern: 'gear',
                constraints: ['teeth_count'],
                complexity: 5
            },
            {
                id: 'stent-mock-1',
                prompt: 'Create a vascular stent',
                code: 'import cadquery as cq\n# Stent implementation',
                geometricPattern: 'stent',
                constraints: ['length', 'diameter'],
                complexity: 7
            },
            {
                id: 'bracket-mock-1',
                prompt: 'Create a bracket with holes',
                code: 'import cadquery as cq\n# Bracket implementation',
                geometricPattern: 'bracket',
                constraints: ['dimensions'],
                complexity: 4
            }
        ]

        for (const ex of examples) {
            await this.addExample(ex)
        }

        console.log(`✅ Populated with ${examples.length} mock examples`)
    }
}