// src/components/ParameterPanel.tsx
import React, { useState } from 'react'
import { Sliders, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface ParameterPanelProps {
    parameters: Record<string, any>
    onModify: (modification: any) => void
}

export function ParameterPanel({ parameters, onModify }: ParameterPanelProps) {
    const [localParams, setLocalParams] = useState(parameters)

    const handleChange = (key: string, value: number) => {
        setLocalParams(prev => ({ ...prev, [key]: value }))
    }

    const handleApply = () => {
        onModify({
            type: 'parameter',
            parameters: localParams
        })
    }

    const handleReset = () => {
        setLocalParams(parameters)
    }

    return (
        <div className="space-y-4">
            {Object.entries(localParams).map(([key, value]) => (
                <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-sm font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                        </label>
                        <span className="text-sm text-gray-400">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                        </span>
                    </div>

                    {typeof value === 'number' && (
                        <input
                            type="range"
                            min={value * 0.1}
                            max={value * 2}
                            step={value > 10 ? 1 : 0.1}
                            value={value}
                            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    )}
                </div>
            ))}

            <div className="flex space-x-2 pt-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleApply}
                    className="flex-1 btn-primary flex items-center justify-center"
                >
                    <Sliders className="w-4 h-4 mr-2" />
                    Apply
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    className="btn-secondary"
                >
                    <RefreshCw className="w-4 h-4" />
                </motion.button>
            </div>
        </div>
    )
}