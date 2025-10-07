// src/components/PromptInput.tsx
import React, { useState, useRef, KeyboardEvent } from 'react'
import { Send, Download, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface PromptInputProps {
    onGenerate: (prompt: string, options?: any) => void
    onDownloadSTL?: () => void
    isGenerating: boolean
    disabled?: boolean
    hasModel?: boolean
}

export function PromptInput({ onGenerate, onDownloadSTL, isGenerating, disabled, hasModel }: PromptInputProps) {
    const [prompt, setPrompt] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSubmit = () => {
        if (prompt.trim() && !isGenerating && !disabled) {
            onGenerate(prompt.trim())
            setPrompt('')
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const examples = [
        "Create a gear with 12 teeth and center hole",
        "Design a phone stand with adjustable angle",
        "Make a parametric box with lid",
        "Generate a lattice cube 50mm with 70% porosity"
    ]

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-gray-800">
            <div className="flex items-end space-x-3">
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you want to create..."
                        disabled={disabled || isGenerating}
                        className="w-full px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 
                     resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 
                     disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={3}
                    />

                    {prompt.length === 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {examples.map((example, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPrompt(example)}
                                    disabled={disabled || isGenerating}
                                    className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 
                           rounded-full text-gray-400 hover:text-white transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles className="w-3 h-3 inline mr-1" />
                                    {example.substring(0, 30)}...
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex space-x-2">
                    <motion.button
                        whileHover={{ scale: hasModel ? 1.05 : 1 }}
                        whileTap={{ scale: hasModel ? 0.95 : 1 }}
                        onClick={onDownloadSTL}
                        disabled={!hasModel || disabled}
                        className={`p-3 rounded-xl transition-all ${hasModel && !disabled
                                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                                : 'bg-gray-800 cursor-not-allowed opacity-50'
                            }`}
                        title={hasModel ? "Download STL" : "Generate a model first"}
                    >
                        <Download className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSubmit}
                        disabled={!prompt.trim() || isGenerating || disabled}
                        className={`p-3 rounded-xl transition-all flex items-center space-x-2 px-5
              ${prompt.trim() && !isGenerating && !disabled
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                                : 'bg-gray-800 cursor-not-allowed opacity-50'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                        <span className="font-semibold">Generate</span>
                    </motion.button>
                </div>
            </div>
        </div>
    )
}