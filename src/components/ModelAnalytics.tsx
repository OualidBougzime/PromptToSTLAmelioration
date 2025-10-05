// src/components/ModelAnalytics.tsx
import React from 'react'
import { TrendingUp, Box, Layers, Cpu } from 'lucide-react'

interface ModelAnalyticsProps {
    model: any
}

export function ModelAnalytics({ model }: ModelAnalyticsProps) {
    if (!model) return null

    const stats = [
        {
            icon: Box,
            label: 'Complexity',
            value: model.analysis?.complexity || 'N/A',
            color: 'text-blue-400'
        },
        {
            icon: Layers,
            label: 'Features',
            value: model.design?.features?.length || 0,
            color: 'text-green-400'
        },
        {
            icon: Cpu,
            label: 'Operations',
            value: model.design?.operations?.length || 0,
            color: 'text-purple-400'
        },
        {
            icon: TrendingUp,
            label: 'Score',
            value: `${model.validation?.score || 0}%`,
            color: 'text-yellow-400'
        }
    ]

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                                <Icon className={`w-4 h-4 ${stat.color}`} />
                                <span className="text-xs text-gray-400">{stat.label}</span>
                            </div>
                            <div className="text-lg font-semibold">{stat.value}</div>
                        </div>
                    )
                })}
            </div>

            {model.validation?.suggestions && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Suggestions</h4>
                    <ul className="space-y-1">
                        {model.validation.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-400">
                                • {suggestion}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}