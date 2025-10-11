// server/scripts/populate-vector-db.ts - VERSION SIMPLIFIÉE
import { VectorStore } from '../rag/vector-store'

async function populateDB() {
    console.log('🔄 Starting Vector Database Population...\n')

    try {
        const vectorStore = new VectorStore()

        // Créer la collection
        await vectorStore.createCollection()

        // Peupler avec les exemples (inclus dans VectorStore)
        await vectorStore.populateWithExamples()

        console.log('\n✅ Database population complete!')
        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Population failed:', error.message)
        console.error(error.stack)
        process.exit(1)
    }
}

// Lancer
populateDB()