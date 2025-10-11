// server/main.ts - VERSION 2.0 COMPLÈTE
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { AgentOrchestratorV2 } from './agents/orchestrator'
import axios from 'axios'

console.log('\n' + '='.repeat(60))
console.log('🔧 ENVIRONMENT VARIABLES CHECK')
console.log('='.repeat(60))
console.log(`OLLAMA_URL: ${process.env.OLLAMA_URL || '❌ NOT SET (using default)'}`)
console.log(`OLLAMA_MODEL: ${process.env.OLLAMA_MODEL || '❌ NOT SET (using default)'}`)
console.log(`QDRANT_URL: ${process.env.QDRANT_URL || '❌ NOT SET (using default)'}`)
console.log(`PORT: ${process.env.PORT || '❌ NOT SET (using default)'}`)
console.log('='.repeat(60) + '\n')

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

const orchestrator = new AgentOrchestratorV2()
const sessions = new Map<string, any>()

// ============================================
// INITIALISATION
// ============================================
async function initializeServer() {
    console.log('🚀 Initializing CADAM-X v2.0...')

    try {
        await orchestrator.initialize()
        console.log('✅ Orchestrator initialized')
    } catch (error) {
        console.warn('⚠️ Orchestrator initialization failed (RAG disabled):', error.message)
        console.log('   System will run without RAG features')
    }

    const PORT = process.env.PORT || 8787
    httpServer.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════╗
║       CADAM-X v2.0 - RAG + Multi-Agent       ║
╠══════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}       ║
║  🧠 LLM:        Ollama (${process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'})
║  🔄 WebSocket:  Ready                        ║
║  📚 RAG:        ${process.env.QDRANT_URL ? 'Active' : 'Disabled'}                    ║
╚══════════════════════════════════════════════╝
        `)
    })
}

// ============================================
// WEBSOCKET EVENTS
// ============================================
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)

    sessions.set(socket.id, {
        id: socket.id,
        history: [],
        timestamp: Date.now()
    })

    socket.on('generate', async (data) => {
        const { prompt, options = {} } = data
        const session = sessions.get(socket.id)

        try {
            socket.emit('generation:start', { prompt })

            const result = await orchestrator.process(prompt, {
                ...options,
                session,
                onAgentUpdate: (agent: string, status: any) => {
                    socket.emit('agent:update', { agent, status })
                },
                onProgress: (progress: any) => {
                    socket.emit('generation:progress', progress)
                },
                onPartialResult: (partial: any) => {
                    socket.emit('generation:partial', partial)
                }
            })

            session.history.push({ prompt, result, timestamp: Date.now() })
            socket.emit('generation:complete', result)

        } catch (error: any) {
            console.error('❌ Generation error:', error)
            socket.emit('generation:error', {
                error: error.message,
                details: error.stack
            })
        }
    })

    socket.on('modify', async (data) => {
        const { modelId, modification } = data

        try {
            const result = await orchestrator.modify(modelId, modification)
            socket.emit('modification:complete', result)
        } catch (error: any) {
            socket.emit('modification:error', { error: error.message })
        }
    })

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id)
        sessions.delete(socket.id)
    })
})

// ============================================
// HTTP ENDPOINTS
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0'
    })
})

app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' })
        }

        const result = await orchestrator.process(prompt)
        res.json(result)
    } catch (error: any) {
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

app.post('/api/export-stl', async (req, res) => {
    try {
        const { code } = req.body

        if (!code) {
            return res.status(400).json({ error: 'No code provided' })
        }

        console.log('📦 Exporting STL...')

        const response = await axios.post('http://localhost:8788/export', {
            code,
            format: 'stl'
        }, {
            timeout: 30000,
            responseType: 'arraybuffer'
        })

        console.log('✅ STL generated successfully')

        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', 'attachment; filename="model.stl"')
        res.send(Buffer.from(response.data))

    } catch (error: any) {
        console.error('❌ STL export error:', error.message)
        res.status(500).json({
            error: 'Failed to export STL',
            details: error.message
        })
    }
})

app.get('/api/metrics', (req, res) => {
    try {
        const metrics = orchestrator.getMetrics()
        res.json(metrics)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/metrics/failures', (req, res) => {
    try {
        const failures = orchestrator.getRecentFailures()
        res.json(failures)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// ============================================
// ERROR HANDLING
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Server error:', err)
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    })
})

// ============================================
// START SERVER
// ============================================
initializeServer().catch((error) => {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...')
    httpServer.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
    })
})