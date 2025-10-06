// server/knowledge/knowledge-base.ts - Version SAFE qui ne crash pas
import { MongoClient, Db, Collection } from 'mongodb'

export class KnowledgeBase {
    private db: Db | null = null
    private patterns: Collection | null = null
    private solutions: Collection | null = null
    private materials: Collection | null = null
    private isConnected: boolean = false
    private memoryCache: Map<string, any[]> = new Map()

    constructor() {
        console.log('📚 Initializing Knowledge Base...')
        // Lance la connexion de manière asynchrone SANS bloquer
        this.connect().catch(err => {
            console.warn('⚠️ MongoDB not available, using in-memory mode')
        })
    }

    private async connect() {
        try {
            const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cadam-x'

            const client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 3000,
                connectTimeoutMS: 3000,
            })

            await client.connect()
            this.db = client.db('cadam-x')
            this.patterns = this.db.collection('patterns')
            this.solutions = this.db.collection('solutions')
            this.materials = this.db.collection('materials')

            this.isConnected = true
            console.log('✅ MongoDB connected successfully')

            // Crée les index de manière non-bloquante
            this.createIndexes().catch(() => { })

        } catch (error: any) {
            console.warn('⚠️ MongoDB not available - running in memory mode')
            this.isConnected = false
        }
    }

    private async createIndexes() {
        if (!this.patterns || !this.solutions) return
        try {
            await this.patterns.createIndex({ prompt: 'text' })
            await this.solutions.createIndex({ domain: 1, score: -1 })
        } catch { }
    }

    async search(query: string): Promise<any[]> {
        if (!this.isConnected || !this.patterns) {
            return this.searchInMemory(query)
        }

        try {
            return await this.patterns.find(
                { $text: { $search: query } },
                { score: { $meta: "textScore" } }
            ).sort({ score: { $meta: "textScore" } }).limit(10).toArray()
        } catch {
            return this.searchInMemory(query)
        }
    }

    private searchInMemory(query: string): any[] {
        const cached = this.memoryCache.get('patterns') || []
        const lowerQuery = query.toLowerCase()
        return cached
            .filter(item => item.prompt?.toLowerCase().includes(lowerQuery))
            .slice(0, 10)
    }

    async add(type: string, data: any): Promise<string> {
        // Toujours en mémoire
        if (!this.memoryCache.has(type)) {
            this.memoryCache.set(type, [])
        }
        this.memoryCache.get(type)!.push(data)

        // Essaie MongoDB si disponible
        if (!this.isConnected || !this.db) {
            return `memory-${Date.now()}`
        }

        try {
            const collection = this.db.collection(type)
            const result = await collection.insertOne({
                ...data,
                createdAt: new Date(),
                version: 1
            })
            return result.insertedId.toString()
        } catch {
            return `memory-${Date.now()}`
        }
    }

    async getSimilarSolutions(analysis: any): Promise<any[]> {
        if (!this.isConnected || !this.solutions) return []
        try {
            return await this.solutions.find({
                domain: analysis.domain,
                complexity: {
                    $gte: analysis.complexity - 0.2,
                    $lte: analysis.complexity + 0.2
                }
            }).sort({ score: -1 }).limit(5).toArray()
        } catch {
            return []
        }
    }

    async getMaterialProperties(material: string): Promise<any> {
        if (!this.isConnected || !this.materials) {
            return this.getDefaultMaterial(material)
        }

        try {
            const result = await this.materials.findOne({ name: material })
            return result || this.getDefaultMaterial(material)
        } catch {
            return this.getDefaultMaterial(material)
        }
    }

    private getDefaultMaterial(material: string): any {
        const defaults: Record<string, any> = {
            'pla': { density: 1.24, strength: 50, flexibility: 'low' },
            'abs': { density: 1.05, strength: 40, flexibility: 'medium' },
            'petg': { density: 1.27, strength: 53, flexibility: 'medium' },
            'aluminum': { density: 2.70, strength: 276, flexibility: 'low' },
            'steel': { density: 7.85, strength: 400, flexibility: 'low' }
        }
        return defaults[material.toLowerCase()] || { density: 1.0, strength: 30 }
    }

    async updatePattern(id: string, updates: any): Promise<void> {
        if (!this.isConnected || !this.patterns) return
        try {
            await this.patterns.updateOne(
                { _id: id },
                { $set: updates, $inc: { version: 1 } }
            )
        } catch { }
    }
}