// server/main.ts
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { AgentOrchestrator } from './agents/orchestrator'
import axios from 'axios'

console.log('\n' + '='.repeat(60))
console.log('🔧 ENVIRONMENT VARIABLES CHECK')
console.log('='.repeat(60))
console.log(`OLLAMA_URL: ${process.env.OLLAMA_URL || '❌ NOT SET (using default)'}`)
console.log(`OLLAMA_MODEL: ${process.env.OLLAMA_MODEL || '❌ NOT SET (using default)'}`)
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

const orchestrator = new AgentOrchestrator()

const sessions = new Map<string, any>()

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)

    sessions.set(socket.id, {
        id: socket.id,
        history: []
    })

    socket.on('generate', async (data) => {
        const { prompt, options = {} } = data
        const session = sessions.get(socket.id)

        try {
            socket.emit('generation:start', { prompt })

            const result = await orchestrator.process(prompt, {
                ...options,
                onAgentUpdate: (agent, status) => {
                    socket.emit('agent:update', { agent, status })
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

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id)
        sessions.delete(socket.id)
    })
})

app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body
        const result = await orchestrator.process(prompt)
        res.json(result)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
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

// 🔥 NOUVEAUX ENDPOINTS DE MONITORING

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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    })
})

const PORT = process.env.PORT || 8787
httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║       CADAM-X v3.0 - LLM-Powered             ║
╠══════════════════════════════════════════════╣
║  🚀 Server:     http://localhost:${PORT}       ║
║  🧠 LLM:        Ollama                       ║
║  🔄 WebSocket:  Ready                        ║
╚══════════════════════════════════════════════╝
  `)
})