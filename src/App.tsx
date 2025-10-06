// src/App.tsx - Version corrigée avec bonnes icônes
import React, { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { PromptInput } from './components/PromptInput'
import { ModelViewer } from './components/ModelViewer'
import { AgentStatus } from './components/AgentStatus'
import { CodeEditor } from './components/CodeEditor'
import { ParameterPanel } from './components/ParameterPanel'
import { Toaster, toast } from 'react-hot-toast'
import { Box, Code, Settings, Zap } from 'lucide-react'

export default function App() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentModel, setCurrentModel] = useState<any>(null)
    const [agents, setAgents] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'code' | 'params'>('code')

    // Connect to server
    useEffect(() => {
        console.log('🔌 Connecting to server...')
        const newSocket = io('http://localhost:8787', {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        newSocket.on('connect', () => {
            console.log('✅ Connected to CADAM-X server')
            setIsConnected(true)
            toast.success('Connected to server')
        })

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from server')
            setIsConnected(false)
            toast.error('Disconnected from server')
        })

        newSocket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error)
            toast.error('Cannot connect to server. Is it running on port 8787?')
        })

        // Generation events
        newSocket.on('generation:start', () => {
            setIsGenerating(true)
            setAgents([])
            toast.loading('Starting generation...', { id: 'gen' })
        })

        newSocket.on('agent:update', ({ agent, status }) => {
            console.log('🤖 Agent update:', agent, status)
            setAgents(prev => {
                const existing = prev.find(a => a.agent === agent)
                if (existing) {
                    return prev.map(a => a.agent === agent ? { agent, status } : a)
                }
                return [...prev, { agent, status }]
            })
        })

        newSocket.on('generation:progress', (progress) => {
            console.log('📊 Progress:', progress)
        })

        newSocket.on('generation:partial', (partial) => {
            console.log('🔄 Partial result:', partial)
        })

        newSocket.on('generation:complete', (result) => {
            console.log('✅ Generation complete:', result)
            setIsGenerating(false)
            setCurrentModel(result)
            toast.success('Generation complete!', { id: 'gen' })
        })

        newSocket.on('generation:error', ({ error }) => {
            console.error('❌ Generation error:', error)
            setIsGenerating(false)
            toast.error(`Error: ${error}`, { id: 'gen' })
        })

        setSocket(newSocket)

        return () => {
            console.log('🔌 Closing socket connection')
            newSocket.close()
        }
    }, [])

    const handleGenerate = (prompt: string, options?: any) => {
        if (!socket || !isConnected) {
            toast.error('Not connected to server. Please start the backend!')
            return
        }

        console.log('🚀 Emitting generate event:', prompt)
        socket.emit('generate', { prompt, options })
    }

    const handleModify = (modification: any) => {
        if (!socket || !currentModel) {
            toast.error('No model to modify')
            return
        }

        console.log('🔧 Emitting modify event:', modification)
        socket.emit('modify', {
            modelId: currentModel.id || Date.now().toString(),
            modification
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Box className="w-8 h-8 text-blue-500" />
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                                CADAM-X
                            </h1>
                            <p className="text-xs text-gray-400">Multi-Agent CAD System</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${isConnected
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                            <span className="animate-pulse">●</span>
                            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">

                    {/* Left Panel - Agents Status */}
                    <div className="col-span-3">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                                Active Agents
                            </h2>
                            <AgentStatus agents={agents} />
                        </div>
                    </div>

                    {/* Center - 3D Viewer */}
                    <div className="col-span-6 space-y-6">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 h-[500px] overflow-hidden">
                            {currentModel ? (
                                <ModelViewer model={currentModel} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <Box className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
                                        <p className="text-lg">No model generated yet</p>
                                        <p className="text-sm mt-2">Enter a prompt below to start</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prompt Input */}
                        <PromptInput
                            onGenerate={handleGenerate}
                            isGenerating={isGenerating}
                            disabled={!isConnected}
                        />
                    </div>

                    {/* Right Panel - Details */}
                    <div className="col-span-3">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-4">
                            {/* Tabs */}
                            <div className="flex space-x-2 mb-4 border-b border-gray-800">
                                <button
                                    onClick={() => setActiveTab('code')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'code'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Code className="w-4 h-4" />
                                    <span>Code</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('params')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'params'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Params</span>
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'code' ? (
                                currentModel?.code ? (
                                    <CodeEditor
                                        code={currentModel.code.cadquery || currentModel.code.python || '# No code generated'}
                                        language="python"
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No code available</p>
                                    </div>
                                )
                            ) : (
                                currentModel?.design?.parameters ? (
                                    <ParameterPanel
                                        parameters={currentModel.design.parameters}
                                        onModify={handleModify}
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No parameters available</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Info */}
            <div className="fixed bottom-4 right-4 text-xs text-gray-600 bg-gray-900/80 px-3 py-2 rounded-lg backdrop-blur">
                <div>Backend: {isConnected ? '🟢' : '🔴'} localhost:8787</div>
                <div>Frontend: 🟢 localhost:5173</div>
            </div>
        </div>
    )
}