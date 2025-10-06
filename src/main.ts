// server/main.ts - Version simplifiée
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { AgentOrchestrator } from './agents/orchestrator'
import { UnifiedEngine } from './engines/unified'
import { KnowledgeBase } from './knowledge/knowledge-base'
// import { MLEngine } from './learning/ml-engine' // ❌ DÉSACTIVÉ

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

const orchestrator = new AgentOrchestrator()
const engine = new UnifiedEngine()
const knowledge = new KnowledgeBase()
// const ml = new MLEngine() // ❌ DÉSACTIVÉ

const sessions = new Map<string, any>()

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)

    sessions.set(socket.id, {
        id: socket.id,
        history: [],
        preferences: {},
        activeAgents: []
    })

    socket.on('generate', async (data) => {
        const { prompt, options = {} } = data
        const session = sessions.get(socket.id)

        try {
            socket.emit('generation:start', { prompt })

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

            // ✅ Apprentissage désactivé
            // await ml.learn(prompt, result)

            session.history.push({ prompt, result, timestamp: Date.now() })
            socket.emit('generation:complete', result)

        } catch (error) {
            console.error('Erreur génération:', error)
            socket.emit('generation:error', {
                error: error.message,
                details: error.stack
            })
        }
    })

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id)
        sessions.delete(socket.id)
    })
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
║  🔄 WebSocket:  Ready                        ║
║  📚 Knowledge:  Connected                    ║
╚══════════════════════════════════════════════╝
  `)
})