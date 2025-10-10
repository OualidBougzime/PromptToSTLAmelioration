// server/agents/llm-agent.ts
import axios from 'axios'
import { EventEmitter } from 'events'
import { AdvancedPromptBuilder } from '../prompts/advanced-prompt-builder'
import { CodeValidator } from '../validation/code-validator'

export class LLMAgent extends EventEmitter {
    private ollamaUrl: string
    private ollamaModel: string

    constructor() {
        super()
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
        this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'
        console.log(`🧠 LLM: Ollama (${this.ollamaModel})`)
    }

    async generateCADCode(prompt: string, options: any = {}): Promise<string> {
        const { strategy = 'enhanced', previousErrors = [], attempt = 1 } = options

        console.log(`🧠 Generating (attempt ${attempt}, strategy: ${strategy})`)

        const systemPrompt = AdvancedPromptBuilder.buildPrompt(prompt, {
            previousErrors,
            attempt
        })

        const response = await axios.post(
            `${this.ollamaUrl}/api/generate`,
            {
                model: this.ollamaModel,
                prompt: systemPrompt,
                stream: false,
                options: { temperature: 0.1, num_predict: 1500 }
            },
            { timeout: 120000 }
        )

        const code = this.extractCode(response.data.response)

        // 🔥 FIX: Vérifier que code n'est pas vide
        if (!code || code.trim().length === 0) {
            throw new Error('Failed to extract valid code from LLM response')
        }

        return CodeValidator.validateAndFix(code).code
    }

    private extractCode(response: string): string {
        // Essayer d'extraire depuis bloc Python
        const pythonMatch = response.match(/```python\n([\s\S]*?)\n```/)
        if (pythonMatch && pythonMatch[1].trim()) {
            return pythonMatch[1].trim()
        }

        // Essayer bloc générique
        const genericMatch = response.match(/```\n([\s\S]*?)\n```/)
        if (genericMatch && genericMatch[1].trim()) {
            return genericMatch[1].trim()
        }

        // Essayer de trouver code CadQuery sans blocs
        const codeMatch = response.match(/(import cadquery[\s\S]*?show_object\([^)]+\))/i)
        if (codeMatch && codeMatch[1].trim()) {
            return codeMatch[1].trim()
        }

        // 🔥 FIX: Si tout échoue, vérifier si le texte complet est du code
        if (response.includes('import cadquery') && response.includes('show_object')) {
            return response.trim()
        }

        // 🔥 NOUVEAU: Retourner un pattern fallback au lieu de throw
        console.warn('⚠️ Could not extract code, using fallback pattern')
        return `import cadquery as cq

# Fallback: Simple box
result = cq.Workplane("XY").box(30.0, 20.0, 10.0)

show_object(result)`
    }

    async improveCodeWithFeedback(code: string, error: string, errorType: string): Promise<string> {
        const fixPrompt = `Fix this CadQuery code.

ERROR: ${error}
TYPE: ${errorType}

CODE:
\`\`\`python
${code}
\`\`\`

Return ONLY fixed code in \`\`\`python blocks.`

        try {
            const response = await axios.post(
                `${this.ollamaUrl}/api/generate`,
                {
                    model: this.ollamaModel,
                    prompt: fixPrompt,
                    stream: false,
                    options: { temperature: 0.1, num_predict: 1000 }
                },
                { timeout: 60000 }
            )

            return this.extractCode(response.data.response)
        } catch (error: any) {
            return code
        }
    }
}