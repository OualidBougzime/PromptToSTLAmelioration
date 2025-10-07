// server/agents/llm-agent.ts
import axios from 'axios'
import { EventEmitter } from 'events'

export class LLMAgent extends EventEmitter {
    private ollamaUrl: string
    private ollamaModel: string
    private anthropicKey: string | undefined
    private useAnthropic: boolean

    constructor() {
        super()

        // 🔥 LECTURE AVEC LOGS
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
        this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'
        this.anthropicKey = process.env.ANTHROPIC_API_KEY
        this.useAnthropic = false

        // 🔥 DEBUG COMPLET
        console.log('\n' + '='.repeat(60))
        console.log('🧠 LLM AGENT INITIALIZATION')
        console.log('='.repeat(60))
        console.log(`Ollama URL (from env): ${process.env.OLLAMA_URL}`)
        console.log(`Ollama URL (used): ${this.ollamaUrl}`)
        console.log(`Ollama Model (from env): ${process.env.OLLAMA_MODEL}`)
        console.log(`Ollama Model (used): ${this.ollamaModel}`)
        console.log(`Anthropic Key: ${this.anthropicKey ? 'SET' : 'NOT SET'}`)
        console.log('='.repeat(60) + '\n')

        if (this.anthropicKey) {
            console.log('🧠 LLM Agent: Using Anthropic Claude API')
            this.useAnthropic = true
        } else {
            console.log(`🧠 LLM Agent: Using Ollama (${this.ollamaModel})`)
        }
    }

    async generateCADCode(prompt: string, context?: any): Promise<string> {
        this.emit('state', { status: 'generating', progress: 0 })

        console.log(`\n🧠 LLM: Generating code for: "${prompt}"`)

        try {
            if (!this.useAnthropic) {
                return await this.generateWithOllama(prompt)
            } else {
                return await this.generateWithAnthropic(prompt)
            }
        } catch (error: any) {
            console.error('❌ Primary LLM failed:', error.message)

            if (!this.useAnthropic && this.anthropicKey) {
                console.log('🔄 Falling back to Anthropic...')
                try {
                    return await this.generateWithAnthropic(prompt)
                } catch (anthropicError: any) {
                    console.error('❌ Anthropic fallback failed:', anthropicError.message)
                }
            }

            return this.generateFallback(prompt)
        }
    }

    private async generateWithOllama(prompt: string): Promise<string> {
        const systemPrompt = this.buildSystemPrompt(prompt)
        const fullUrl = `${this.ollamaUrl}/api/generate`

        console.log(`\n📡 Ollama Request:`)
        console.log(`  URL: ${fullUrl}`)
        console.log(`  Model: ${this.ollamaModel}`)

        try {
            const response = await axios.post(
                fullUrl,
                {
                    model: this.ollamaModel,
                    prompt: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        top_p: 0.9,
                        num_predict: 1200,
                        num_ctx: 4096
                    }
                },
                { timeout: 360000 }
            )

            console.log(`✅ Ollama responded: ${response.status}`)
            console.log(`✅ Response length: ${response.data.response?.length || 0} chars`)

            this.emit('state', { status: 'complete', progress: 100 })
            return this.extractCode(response.data.response)

        } catch (error: any) {
            console.error(`\n❌ Ollama Error:`)
            console.error(`  URL: ${fullUrl}`)
            console.error(`  Model: ${this.ollamaModel}`)
            console.error(`  Status: ${error.response?.status || 'N/A'}`)
            console.error(`  Message: ${error.message}`)
            console.error(`  Code: ${error.code}`)
            throw error
        }
    }

    private async generateWithAnthropic(prompt: string): Promise<string> {
        if (!this.anthropicKey) {
            throw new Error('Anthropic API key not configured')
        }

        const systemPrompt = this.buildSystemPrompt(prompt)

        console.log(`\n📡 Anthropic Request:`)
        console.log(`  Model: claude-3-5-sonnet-20241022`)

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ]
            },
            {
                headers: {
                    'x-api-key': this.anthropicKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                timeout: 30000
            }
        )

        console.log(`✅ Anthropic responded: ${response.status}`)

        this.emit('state', { status: 'complete', progress: 100 })
        const text = response.data.content[0].text
        return this.extractCode(text)
    }

    private buildSystemPrompt(prompt: string): string {
        return `You are an expert CadQuery code generator.

🚨 CRITICAL: NEVER use .fillet() or .chamfer() on .ellipse() shapes - causes infinite loops! 🚨

MANDATORY RULES:
1. Start with: import cadquery as cq
2. End with: show_object(result)
3. NO .fillet() on ellipses
4. Use parametric variables

KEY EXAMPLES:

ELLIPSE (NO FILLET):
\`\`\`python
import cadquery as cq
result = cq.Workplane("XY").ellipse(15, 7.5).extrude(30)
chamber = cq.Workplane("XY").ellipse(11, 3.5).extrude(28).translate((0,0,1))
result = result.cut(chamber)
show_object(result)
\`\`\`

GEAR:
\`\`\`python
import cadquery as cq
import math
teeth = 12
outer_radius = 10
height = 5
center_hole = 3
root_radius = outer_radius * 0.8
tooth_width = (2 * math.pi * outer_radius) / (teeth * 2.5)
tooth_angle = 360 / teeth
result = cq.Workplane("XY").circle(root_radius).extrude(height)
tooth = (cq.Workplane("XY")
    .moveTo(outer_radius, -tooth_width/2)
    .lineTo(root_radius, -tooth_width/3)
    .lineTo(root_radius, tooth_width/3)
    .lineTo(outer_radius, tooth_width/2)
    .close().extrude(height))
for i in range(teeth):
    angle = i * tooth_angle
    result = result.union(tooth.rotate((0,0,0), (0,0,1), angle))
if center_hole > 0:
    result = result.faces(">Z").workplane().circle(center_hole/2).cutThruAll()
show_object(result)
\`\`\`

PHONE HOLDER:
\`\`\`python
import cadquery as cq
base = cq.Workplane("XY").box(100, 80, 5)
back = cq.Workplane("XY").workplane(offset=5).box(79, 20, 60)
back = back.rotate((0,0,5), (1,0,0), -60)
lip = cq.Workplane("XY").workplane(offset=5).box(79, 10, 8)
result = base.union(back).union(lip)
show_object(result)
\`\`\`

BOX WITH FILLET (OK on boxes):
\`\`\`python
import cadquery as cq
result = cq.Workplane("XY").box(30, 20, 10).edges("|Z").fillet(2)
show_object(result)
\`\`\`

Generate code for: "${prompt}"
Return ONLY Python code in \`\`\`python blocks.`
    }

    private extractCode(response: string): string {
        // Chercher le code entre ```python et ```
        const pythonMatch = response.match(/```python\n([\s\S]*?)\n```/)
        if (pythonMatch) {
            console.log('📝 Extracted code from python markdown block')
            return pythonMatch[1].trim()
        }

        // Chercher le code entre ``` et ```
        const genericMatch = response.match(/```\n([\s\S]*?)\n```/)
        if (genericMatch) {
            console.log('📝 Extracted code from generic markdown block')
            return genericMatch[1].trim()
        }

        // Pattern matching : chercher du début jusqu'à show_object
        const codeMatch = response.match(/(import cadquery[\s\S]*?show_object\([^)]+\))/i)
        if (codeMatch) {
            console.log('📝 Extracted code by pattern matching')
            return codeMatch[1].trim()
        }

        // Si contient du code valide sans markdown
        if (response.includes('import cadquery') && response.includes('show_object')) {
            console.log('📝 Using full response as code')
            return response.trim()
        }

        console.warn('⚠️ No valid code found in response')
        throw new Error('Could not extract valid CadQuery code from response')
    }

    private generateFallback(prompt: string): string {
        console.warn('⚠️ Using fallback code generation')

        return `import cadquery as cq

# Fallback for: ${prompt}
# Simple box as placeholder

width = 20
height = 20
depth = 20

result = (cq.Workplane("XY")
    .box(width, height, depth))

show_object(result)
`
    }

    async improveCode(code: string, error: string): Promise<string> {
        console.log(`🔧 LLM: Attempting to fix code...`)
        console.log(`  Error: ${error}`)

        const fixPrompt = `This CadQuery code has an error. Fix it and return ONLY the corrected code.

ERROR: ${error}

CODE:
${code}

Return the complete, fixed code wrapped in \`\`\`python blocks:`

        try {
            if (!this.useAnthropic) {
                const response = await axios.post(
                    `${this.ollamaUrl}/api/generate`,
                    {
                        model: this.ollamaModel,
                        prompt: fixPrompt,
                        stream: false,
                        options: {
                            temperature: 0.2,
                            num_predict: 800
                        }
                    },
                    { timeout: 60000 }
                )

                console.log('✅ Fix attempt completed')
                return this.extractCode(response.data.response)

            } else {
                const response = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    {
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 1500,
                        messages: [{ role: 'user', content: fixPrompt }]
                    },
                    {
                        headers: {
                            'x-api-key': this.anthropicKey!,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        },
                        timeout: 30000
                    }
                )

                console.log('✅ Fix attempt completed')
                return this.extractCode(response.data.content[0].text)
            }

        } catch (error: any) {
            console.error('❌ Could not fix code:', error.message)
            return code  // Retourner le code original
        }
    }
}