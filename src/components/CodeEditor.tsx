// src/components/CodeEditor.tsx
import React, { useState } from 'react'
import { Copy, Save, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface CodeEditorProps {
    code: string
    language: string
    onSave?: (code: string) => void
}

export function CodeEditor({ code, language, onSave }: CodeEditorProps) {
    const [localCode, setLocalCode] = useState(code)
    const [isExpanded, setIsExpanded] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(localCode)
    }

    const handleSave = () => {
        if (onSave) onSave(localCode)
    }

    return (
        <div className={`bg-gray-900 rounded-lg ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
            <div className="flex items-center justify-between p-2 border-b border-gray-800">
                <span className="text-xs text-gray-400">{language}</span>
                <div className="flex space-x-2">
                    <button onClick={handleCopy} className="p-1 hover:bg-gray-800 rounded">
                        <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={handleSave} className="p-1 hover:bg-gray-800 rounded">
                        <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-gray-800 rounded">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <textarea
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
                className={`w-full p-4 bg-transparent text-sm font-mono text-gray-300 resize-none focus:outline-none ${isExpanded ? 'h-[calc(100vh-100px)]' : 'h-64'
                    }`}
                spellCheck={false}
            />
        </div>
    )
}