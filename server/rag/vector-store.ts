// server/rag/vector-store.ts - VERSION FINALE ROBUSTE
import { MockVectorStore } from './mock-vector-store'

// Conditional imports pour éviter les erreurs
let QdrantClient: any
let AutoTokenizer: any
let AutoModel: any
let transformersAvailable = false

try {
    const qdrant = require('@qdrant/js-client-rest')
    QdrantClient = qdrant.QdrantClient
} catch (e) {
    console.warn('⚠️ @qdrant/js-client-rest not installed')
}

try {
    const transformers = require('@xenova/transformers')
    AutoTokenizer = transformers.AutoTokenizer
    AutoModel = transformers.AutoModel
    transformersAvailable = true
} catch (e) {
    console.warn('⚠️ @xenova/transformers not installed')
}

interface Example {
    id: string
    prompt: string
    code: string
    geometricPattern: string
    constraints: string[]
    complexity: number
}

export class VectorStore {
    private client: any
    private collectionName = 'cadquery_examples'
    private model: any = null
    private tokenizer: any = null
    private useMock: boolean = false
    private initialized: boolean = false
    private initPromise: Promise<void> | null = null
    private useSimpleEmbeddings: boolean = false

    constructor() {
        // L'initialisation sera faite lors du premier appel
    }

    /**
     * Initialisation paresseuse - appelée automatiquement
     */
    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return

        // Si une initialisation est en cours, attendre
        if (this.initPromise) {
            return this.initPromise
        }

        // Créer la promesse d'initialisation
        this.initPromise = this.doInitialize()
        await this.initPromise
    }

    private async doInitialize(): Promise<void> {
        console.log('🔄 Initializing VectorStore...')

        const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333'
        const useMockEnv = process.env.USE_MOCK_VECTOR_STORE === 'true'

        // Force mock si demandé
        if (useMockEnv) {
            console.log('⚠️ USE_MOCK_VECTOR_STORE=true, using Mock Vector Store')
            this.useMock = true
            this.client = new MockVectorStore()
            this.initialized = true
            return
        }

        // Vérifier si Qdrant est disponible
        const qdrantAvailable = await this.checkQdrantAvailability(qdrantUrl)

        if (qdrantAvailable && QdrantClient) {
            try {
                this.client = new QdrantClient({ url: qdrantUrl })
                console.log('✅ Connected to Qdrant at', qdrantUrl)

                // Essayer d'initialiser le modèle d'embeddings
                await this.initializeEmbeddingsModel()

                this.initialized = true
                return
            } catch (error: any) {
                console.warn('⚠️ Failed to connect to Qdrant:', error.message)
            }
        }

        // Fallback vers Mock
        console.log('⚠️ Using Mock Vector Store (no Qdrant connection)')
        this.useMock = true
        this.client = new MockVectorStore()
        this.initialized = true
    }

    private async checkQdrantAvailability(url: string): Promise<boolean> {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch(`${url}/collections`, {
                method: 'GET',
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            return response.ok
        } catch {
            return false
        }
    }

    private async initializeEmbeddingsModel(): Promise<void> {
        if (!transformersAvailable || !AutoTokenizer || !AutoModel) {
            console.log('⚠️ Transformers not available, using simple embeddings')
            this.useSimpleEmbeddings = true
            return
        }

        try {
            console.log('🔄 Loading embedding model (this may take 30-60 seconds)...')

            // Utiliser un modèle léger et fiable
            const modelName = 'Xenova/all-MiniLM-L6-v2'

            // Timeout pour le chargement
            const loadPromise = Promise.all([
                AutoTokenizer.from_pretrained(modelName),
                AutoModel.from_pretrained(modelName)
            ])

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Model loading timeout')), 120000)
            })

            const [tokenizer, model] = await Promise.race([
                loadPromise,
                timeoutPromise
            ]) as [any, any]

            this.tokenizer = tokenizer
            this.model = model
            this.useSimpleEmbeddings = false

            console.log('✅ Embedding model loaded successfully')
        } catch (error: any) {
            console.warn('⚠️ Failed to load embedding model:', error.message)
            console.log('   → Using simple keyword-based embeddings instead')
            this.useSimpleEmbeddings = true
            this.model = null
            this.tokenizer = null
        }
    }

    async createCollection(): Promise<void> {
        await this.ensureInitialized()

        if (this.useMock) {
            await this.client.createCollection()
            return
        }

        try {
            const collections = await this.client.getCollections()
            const exists = collections.collections.some(
                (c: any) => c.name === this.collectionName
            )

            if (exists) {
                console.log('✅ Collection already exists')
                return
            }

            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: 384, // Dimension pour MiniLM
                    distance: 'Cosine'
                }
            })
            console.log('✅ Collection created')
        } catch (error: any) {
            console.error('❌ Failed to create collection:', error.message)
            throw error
        }
    }

    async addExample(example: Example): Promise<void> {
        await this.ensureInitialized()

        if (this.useMock) {
            await this.client.addExample(example)
            return
        }

        try {
            const text = `${example.prompt} ${example.geometricPattern} ${example.constraints.join(' ')}`
            const embedding = await this.getEmbedding(text)

            await this.client.upsert(this.collectionName, {
                points: [{
                    id: example.id,
                    vector: embedding,
                    payload: {
                        prompt: example.prompt,
                        code: example.code,
                        geometricPattern: example.geometricPattern,
                        constraints: example.constraints,
                        complexity: example.complexity
                    }
                }]
            })
        } catch (error: any) {
            console.error(`❌ Failed to add example ${example.id}:`, error.message)
        }
    }

    async search(query: string, topK: number = 3): Promise<any[]> {
        await this.ensureInitialized()

        if (this.useMock) {
            return await this.client.search(query, topK)
        }

        try {
            const queryEmbedding = await this.getEmbedding(query)

            const results = await this.client.search(this.collectionName, {
                vector: queryEmbedding,
                limit: topK,
                with_payload: true
            })

            return results.map((r: any) => ({
                score: r.score,
                ...r.payload
            }))
        } catch (error: any) {
            console.error('❌ Search failed:', error.message)
            return []
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        // Si on doit utiliser des embeddings simples
        if (this.useSimpleEmbeddings || !this.model || !this.tokenizer) {
            return this.getSimpleEmbedding(text)
        }

        try {
            // Tokenize
            const inputs = await this.tokenizer(text, {
                padding: true,
                truncation: true,
                max_length: 512,
                return_tensors: 'pt'
            })

            // Get model output
            const outputs = await this.model(inputs)

            // Mean pooling sur la dernière couche cachée
            const lastHiddenState = outputs.last_hidden_state

            // Moyenne sur la dimension des séquences (dim=1)
            let embedding: any

            if (lastHiddenState.mean) {
                embedding = lastHiddenState.mean(1).squeeze()
            } else {
                // Fallback manuel
                const data = lastHiddenState.data || lastHiddenState
                embedding = data
            }

            // Convertir en array
            let embeddingArray: number[]

            if (typeof embedding.tolist === 'function') {
                embeddingArray = embedding.tolist()
            } else if (Array.isArray(embedding)) {
                embeddingArray = embedding
            } else if (embedding.data && Array.isArray(embedding.data)) {
                embeddingArray = Array.from(embedding.data)
            } else if (embedding.buffer) {
                // TypedArray
                embeddingArray = Array.from(embedding)
            } else {
                throw new Error('Cannot convert embedding to array')
            }

            return embeddingArray
        } catch (error: any) {
            console.warn('⚠️ Embedding generation failed:', error.message)
            console.log('   → Falling back to simple embeddings')
            this.useSimpleEmbeddings = true // Passer en mode simple pour les prochains
            return this.getSimpleEmbedding(text)
        }
    }

    /**
     * Embeddings simples basés sur TF-IDF
     */
    private getSimpleEmbedding(text: string): number[] {
        const dimension = 384 // Même dimension que MiniLM
        const embedding = new Array(dimension).fill(0)

        // Tokenisation simple
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2)

        const uniqueWords = [...new Set(words)]

        // Hashing de chaque mot vers une position
        uniqueWords.forEach(word => {
            const hash = this.hashString(word)
            const position = hash % dimension

            // TF (term frequency)
            const tf = words.filter(w => w === word).length / words.length
            embedding[position] += tf

            // Ajouter aussi les bigrammes pour plus de contexte
            if (word.length > 3) {
                for (let i = 0; i < word.length - 1; i++) {
                    const bigram = word.substring(i, i + 2)
                    const bigramHash = this.hashString(bigram)
                    const bigramPos = bigramHash % dimension
                    embedding[bigramPos] += 0.5 * tf
                }
            }
        })

        // Normalisation L2
        const magnitude = Math.sqrt(
            embedding.reduce((sum, val) => sum + val * val, 0)
        )

        return magnitude > 0
            ? embedding.map(v => v / magnitude)
            : embedding
    }

    private hashString(str: string): number {
        let hash = 5381
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) + hash) + char // hash * 33 + char
        }
        return Math.abs(hash)
    }

    async populateWithExamples(): Promise<void> {
        await this.ensureInitialized()

        console.log('🔄 Populating vector database...')

        const examples: Example[] = [
            // GEARS
            {
                id: 'gear-basic-1',
                prompt: 'Create a gear with 12 teeth',
                code: `import cadquery as cq
import math

teeth = 12
module = 2.0
pitch_diameter = teeth * module
outer_diameter = pitch_diameter + 2.0 * module

gear = cq.Workplane("XY").circle(outer_diameter / 2.0).extrude(5.0)

for i in range(teeth):
    angle = (360.0 / teeth) * i
    tooth = (cq.Workplane("XY")
        .transformed(rotate=(0, 0, angle))
        .moveTo(pitch_diameter / 2.0, 0)
        .lineTo(outer_diameter / 2.0, module / 2.0)
        .lineTo(outer_diameter / 2.0, -module / 2.0)
        .close()
        .extrude(5.0))
    gear = gear.union(tooth)

gear = gear.faces(">Z").circle(5.0).cutThruAll()
show_object(gear)`,
                geometricPattern: 'gear',
                constraints: ['teeth_count', 'module', 'center_hole'],
                complexity: 6
            },

            // STENTS
            {
                id: 'stent-basic-1',
                prompt: 'Create a vascular stent',
                code: `import cadquery as cq
import math

length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
result = None

for ring_idx in range(rings):
    z = ring_idx * ring_spacing
    for i in range(12):
        angle = math.radians((360.0 / 12) * i)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        strut = (cq.Workplane("XY")
            .workplane(offset=z)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(ring_spacing * 0.6))
        result = result.union(strut) if result else strut

show_object(result)`,
                geometricPattern: 'stent',
                constraints: ['length', 'diameter', 'strut_thickness', 'rings'],
                complexity: 7
            },

            // BRACKETS
            {
                id: 'bracket-1',
                prompt: 'Create a bracket with mounting holes',
                code: `import cadquery as cq

base = cq.Workplane("XY").box(50.0, 30.0, 5.0)
wall = (cq.Workplane("XY")
    .workplane(offset=5.0)
    .center(-20.0, 0)
    .box(5.0, 30.0, 40.0))
result = base.union(wall)
result = (result.faces("<Z").workplane()
    .rarray(40.0, 20.0, 2, 2)
    .circle(2.5).cutThruAll())
show_object(result)`,
                geometricPattern: 'bracket',
                constraints: ['dimensions', 'holes'],
                complexity: 4
            },

            // BOXES
            {
                id: 'box-1',
                prompt: 'Create a box with lid',
                code: `import cadquery as cq

body = cq.Workplane("XY").box(50.0, 30.0, 20.0)
cavity = cq.Workplane("XY").workplane(offset=2.0).box(46.0, 26.0, 20.0)
body = body.cut(cavity)
lid = cq.Workplane("XY").workplane(offset=20.0).box(51.0, 31.0, 3.0)
result = body.union(lid)
show_object(result)`,
                geometricPattern: 'box',
                constraints: ['dimensions', 'wall_thickness'],
                complexity: 3
            },

            // CYLINDERS
            {
                id: 'cylinder-1',
                prompt: 'Create a hollow cylinder',
                code: `import cadquery as cq

outer = cq.Workplane("XY").circle(10.0).extrude(50.0)
inner = cq.Workplane("XY").circle(8.0).extrude(50.0)
result = outer.cut(inner)
show_object(result)`,
                geometricPattern: 'cylinder',
                constraints: ['radius', 'height'],
                complexity: 2
            }
        ]

        for (const example of examples) {
            await this.addExample(example)
            console.log(`  ✓ Added: ${example.id}`)
        }

        console.log(`✅ Populated with ${examples.length} examples`)
    }
}