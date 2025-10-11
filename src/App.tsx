// src/App.tsx - VERSION CORRIGÉE
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

    const handleDownloadSTL = async () => {
        if (!currentModel || !currentModel.code?.cadquery) {
            toast.error('No model to download')
            return
        }

        try {
            toast.loading('Preparing STL download...', { id: 'stl' })

            const response = await fetch('http://localhost:8787/api/export-stl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: currentModel.code.cadquery
                })
            })

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`)
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `model-${Date.now()}.stl`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success('STL downloaded!', { id: 'stl' })
        } catch (error: any) {
            console.error('Download error:', error)
            toast.error(`Failed to download STL: ${error.message}`, { id: 'stl' })
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
            <Toaster position="top-right" />

            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Box className="w-8 h-8 text-blue-500" />
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                                CADAM-X v2.0
                            </h1>
                            <p className="text-xs text-gray-400">RAG-Powered Multi-Agent CAD System</p>
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

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">

                    {/* COL 1: AGENTS STATUS */}
                    <div className="col-span-3">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                                Active Agents
                            </h2>
                            <AgentStatus agents={agents} />
                        </div>

                        {/* EXECUTION PLAN (NEW) */}
                        {currentModel?.plan && (
                            <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-4 mt-4">
                                <h3 className="text-lg font-semibold mb-2 flex items-center">
                                    <Settings className="w-4 h-4 mr-2 text-blue-400" />
                                    Execution Plan
                                </h3>

                                <div className="space-y-2">
                                    <div className="text-sm text-gray-400">
                                        Strategy: <span className="text-blue-400 font-semibold">{currentModel.plan.strategy}</span>
                                    </div>

                                    <div className="text-sm text-gray-400">
                                        Phases: <span className="text-white font-semibold">{currentModel.plan.phases.length}</span>
                                    </div>

                                    <div className="text-sm text-gray-400">
                                        Estimated Time: <span className="text-white font-semibold">{currentModel.plan.estimatedTime}s</span>
                                    </div>

                                    {currentModel.plan.examples && currentModel.plan.examples.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <h4 className="text-sm font-semibold mb-2 text-purple-400">RAG Examples Used:</h4>
                                            <div className="space-y-1">
                                                {currentModel.plan.examples.map((ex: any, i: number) => (
                                                    <div key={i} className="text-xs text-gray-400 truncate bg-gray-800/50 p-2 rounded">
                                                        <div className="flex items-center justify-between">
                                                            <span className="truncate flex-1">• {ex.prompt}</span>
                                                            <span className="text-purple-400 ml-2">
                                                                {(ex.score * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COL 2: 3D VIEWER + PROMPT */}
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

                        <PromptInput
                            onGenerate={handleGenerate}
                            onDownloadSTL={handleDownloadSTL}
                            isGenerating={isGenerating}
                            disabled={!isConnected}
                            hasModel={!!currentModel}
                        />
                    </div>

                    {/* COL 3: CODE/PARAMS */}
                    <div className="col-span-3">
                        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-4">
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

            <div className="fixed bottom-4 right-4 text-xs text-gray-600 bg-gray-900/80 px-3 py-2 rounded-lg backdrop-blur">
                <div>Backend: {isConnected ? '🟢' : '🔴'} localhost:8787</div>
                <div>Frontend: 🟢 localhost:5173</div>
            </div>
        </div>
    )
}