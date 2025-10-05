// server/knowledge/knowledge-base.ts
import { MongoClient, Db, Collection } from 'mongodb'

export class KnowledgeBase {
    private db: Db
    private patterns: Collection
    private solutions: Collection
    private materials: Collection

    constructor() {
        this.connect()
    }

    private async connect() {
        const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017')
        await client.connect()
        this.db = client.db('cadam-x')
        this.patterns = this.db.collection('patterns')
        this.solutions = this.db.collection('solutions')
        this.materials = this.db.collection('materials')

        // Create indexes
        await this.patterns.createIndex({ prompt: 'text' })
        await this.solutions.createIndex({ domain: 1, score: -1 })
    }

    async search(query: string): Promise<any[]> {
        return await this.patterns.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(10).toArray()
    }

    async add(type: string, data: any): Promise<string> {
        const collection = this.db.collection(type)
        const result = await collection.insertOne({
            ...data,
            createdAt: new Date(),
            version: 1
        })
        return result.insertedId.toString()
    }

    async getSimilarSolutions(analysis: any): Promise<any[]> {
        return await this.solutions.find({
            domain: analysis.domain,
            complexity: { $gte: analysis.complexity - 0.2, $lte: analysis.complexity + 0.2 }
        }).sort({ score: -1 }).limit(5).toArray()
    }

    async getMaterialProperties(material: string): Promise<any> {
        return await this.materials.findOne({ name: material })
    }

    async updatePattern(id: string, updates: any): Promise<void> {
        await this.patterns.updateOne(
            { _id: id },
            { $set: updates, $inc: { version: 1 } }
        )
    }
}