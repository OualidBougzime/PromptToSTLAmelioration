// server/rag/retrieval-agent.ts
import { VectorStore } from './vector-store'
import { EventEmitter } from 'events'

export class RetrievalAgent extends EventEmitter {
    private vectorStore: VectorStore

    constructor() {
        super()
        this.vectorStore = new VectorStore()
    }

    async initialize() {
        await this.vectorStore.createCollection()
        await this.vectorStore.populateWithExamples()
        console.log('✅ RetrievalAgent initialized')
    }

    async retrieveExamples(prompt: string, analysisContext: any): Promise<any[]> {
        this.emit('state', { status: 'retrieving', progress: 0 })

        // 1. Recherche sémantique basique
        const semanticResults = await this.vectorStore.search(prompt, 5)

        // 2. Filtrage par pattern géométrique
        const geometricPattern = analysisContext.geometry?.root?.type
        const filteredByPattern = semanticResults.filter(r =>
            r.geometricPattern === geometricPattern || r.score > 0.8
        )

        // 3. Filtrage par complexité
        const targetComplexity = analysisContext.complexity?.score || 5
        const sortedByComplexity = filteredByPattern.sort((a, b) => {
            const diffA = Math.abs(a.complexity - targetComplexity)
            const diffB = Math.abs(b.complexity - targetComplexity)
            return diffA - diffB
        })

        // 4. Prendre top-3
        const topExamples = sortedByComplexity.slice(0, 3)

        this.emit('state', { status: 'complete', progress: 100 })

        console.log(`✅ Retrieved ${topExamples.length} relevant examples`)
        return topExamples
    }

    async addSuccessfulGeneration(prompt: string, code: string, analysis: any) {
        // Ajouter les générations réussies à la DB pour apprentissage
        await this.vectorStore.addExample({
            id: `gen-${Date.now()}`,
            prompt,
            code,
            geometricPattern: analysis.geometry?.root?.type || 'unknown',
            constraints: Object.keys(analysis.constraints || {}),
            complexity: analysis.complexity?.score || 5
        })

        console.log('✅ Added successful generation to knowledge base')
    }
}