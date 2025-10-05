// src/components/CollaborationPanel.tsx
import React, { useState, useEffect } from 'react'
import { Users, X, MessageSquare, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CollaborationPanelProps {
    roomId: string
    socket: any
    onLeave: () => void
}

export function CollaborationPanel({ roomId, socket, onLeave }: CollaborationPanelProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [users, setUsers] = useState<string[]>([])
    const [isMinimized, setIsMinimized] = useState(false)

    useEffect(() => {
        if (!socket) return

        socket.on('collaborate:user-joined', ({ userId }) => {
            setUsers(prev => [...prev, userId])
        })

        socket.on('collaborate:message', ({ userId, message }) => {
            setMessages(prev => [...prev, { userId, message, timestamp: Date.now() }])
        })

        return () => {
            socket.off('collaborate:user-joined')
            socket.off('collaborate:message')
        }
    }, [socket])

    const sendMessage = () => {
        if (inputMessage.trim() && socket) {
            socket.emit('collaborate:message', {
                roomId,
                message: inputMessage
            })
            setInputMessage('')
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className={`fixed right-4 bottom-4 w-80 bg-gray-900 rounded-lg shadow-2xl border border-gray-800 ${isMinimized ? 'h-14' : 'h-96'
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        <span className="font-semibold">Room: {roomId}</span>
                        <span className="text-xs text-gray-400">({users.length} users)</span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1 hover:bg-gray-800 rounded"
                        >
                            {isMinimized ? '▲' : '▼'}
                        </button>
                        <button
                            onClick={onLeave}
                            className="p-1 hover:bg-gray-800 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {messages.map((msg, idx) => (
                                <div key={idx} className="text-sm">
                                    <span className="text-purple-400">{msg.userId}: </span>
                                    <span className="text-gray-300">{msg.message}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-800">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm focus:outline-none"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    )
}