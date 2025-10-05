// src/components/AgentStatus.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Palette, Settings, Zap, CheckCircle } from 'lucide-react'

interface Agent {
    agent: string
    status: {
        status: string
        progress: number
    }
}

interface AgentStatusProps {
    agents: Agent[]
}

export function AgentStatus({ agents }: AgentStatusProps) {
    const getIcon = (agent: string) => {
        const icons = {
            'analyzer': Brain,
            'designer': Palette,
            'engineer': Settings,
            'optimizer': Zap,
            'validator': CheckCircle
        }
        return icons[agent] || Brain
    }

    const getColor = (status: string) => {
        switch (status) {
            case 'complete': return 'text-green-400'
            case 'active': return 'text-blue-400'
            case 'analyzing':
            case 'designing':
            case 'engineering':
            case 'optimizing':
            case 'validating':
                return 'text-yellow-400'
            default: return 'text-gray-400'
        }
    }

    return (
        <div className="space-y-3">
            {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Agents ready</p>
                </div>
            ) : (
                agents.map((agent) => {
                    const Icon = getIcon(agent.agent)
                    const color = getColor(agent.status.status)

                    return (
                        <motion.div
                            key={agent.agent}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gray-800/50 rounded-lg p-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <Icon className={`w-5 h-5 ${color}`} />
                                    <span className="font-medium capitalize">{agent.agent}</span>
                                </div>
                                <span className={`text-xs ${color}`}>
                                    {agent.status.status}
                                </span>
                            </div>

                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${agent.status.progress}%` }}
                                    transition={{ duration: 0.3 }}
                                    className={`h-1.5 rounded-full ${agent.status.progress === 100
                                            ? 'bg-green-500'
                                            : 'bg-blue-500'
                                        }`}
                                />
                            </div>
                        </motion.div>
                    )
                })
            )}
        </div>
    )
}