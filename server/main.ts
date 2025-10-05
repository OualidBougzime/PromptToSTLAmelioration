// server/main.ts - Serveur Principal avec WebSockets
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { AgentOrchestrator } from './agents/orchestrator'
import { UnifiedEngine } from './engines/unified'
import { KnowledgeBase } from './knowledge/knowledge-base'
import { MLEngine } from './learning/ml-engine'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
})

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Initialisation des systèmes
const orchestrator = new AgentOrchestrator()
const engine = new UnifiedEngine()
const knowledge = new KnowledgeBase()
const ml = new MLEngine()

// État global des sessions
const sessions = new Map<string, any>()

// WebSocket pour communication temps réel
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)

    // Créer une session pour le client
    sessions.set(socket.id, {
        id: socket.id,
        history: [],
        preferences: {},
        activeAgents: []
    })

    // Génération avec streaming
    socket.on('generate', async (data) => {
        const { prompt, options = {} } = data
        const session = sessions.get(socket.id)

        try {
            // Notification de début
            socket.emit('generation:start', { prompt })

            // Lancer l'orchestrateur avec callbacks pour streaming
            const result = await orchestrator.process(prompt, {
                ...options,
                session,
                onAgentUpdate: (agent, status) => {
                    socket.emit('agent:update', { agent, status })
                },
                onProgress: (progress) => {
                    socket.emit('generation:progress', progress)
                },
                onPartialResult: (partial) => {
                    socket.emit('generation:partial', partial)
                }
            })

            // Apprentissage à partir du résultat
            await ml.learn(prompt, result)

            // Sauvegarder dans l'historique
            session.history.push({ prompt, result, timestamp: Date.now() })

            // Envoi du résultat final
            socket.emit('generation:complete', result)

        } catch (error) {
            console.error('Erreur génération:', error)
            socket.emit('generation:error', {
                error: error.message,
                details: error.stack
            })
        }
    })

    // Modification en temps réel
    socket.on('modify', async (data) => {
        const { modelId, modification } = data

        socket.emit('modification:start', { modelId })

        try {
            const result = await orchestrator.modify(modelId, modification)
            socket.emit('modification:complete', result)
        } catch (error) {
            socket.emit('modification:error', { error: error.message })
        }
    })

    // Collaboration P2P
    socket.on('collaborate:join', (roomId) => {
        socket.join(roomId)
        socket.to(roomId).emit('collaborate:user-joined', { userId: socket.id })
    })

    socket.on('collaborate:update', (data) => {
        const { roomId, update } = data
        socket.to(roomId).emit('collaborate:sync', update)
    })

    // Déconnexion
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id)
        sessions.delete(socket.id)
    })
})

// API REST pour compatibilité
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, options } = req.body
        const result = await orchestrator.process(prompt, options)
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Knowledge Base API
app.get('/api/knowledge/search', async (req, res) => {
    const { query } = req.query
    const results = await knowledge.search(query as string)
    res.json(results)
})

app.post('/api/knowledge/add', async (req, res) => {
    const { type, data } = req.body
    const id = await knowledge.add(type, data)
    res.json({ id })
})

// ML Insights API
app.get('/api/insights', async (req, res) => {
    const insights = await ml.getInsights()
    res.json(insights)
})

app.get('/api/suggestions', async (req, res) => {
    const { prompt } = req.query
    const suggestions = await ml.getSuggestions(prompt as string)
    res.json(suggestions)
})

const PORT = process.env.PORT || 8787
httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           CADAM-X SERVER v2.0                ║
║     Multi-Agent CAD Generation System        ║
╠══════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}       ║
║  🤖 Agents:     Active                       ║
║  🧠 ML:         Enabled                      ║
║  🔄 WebSocket:  Ready                        ║
║  📚 Knowledge:  Connected                    ║
╚══════════════════════════════════════════════╝
  `)
})