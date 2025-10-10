// server/agents/llm-agent.ts
import axios from 'axios'
import { EventEmitter } from 'events'
import { SpecializedPrompts } from '../prompts/specialized-prompts'

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

        console.log(`\n🧠 Generating code for: "${prompt}"`)

        let systemPrompt = ''
        const lower = prompt.toLowerCase()

        // 🔥 VÉRIFIER ERREURS LOFT PRÉCÉDENTES
        const hasLoftError = context?.previousErrors?.some(
            (err: any) => err.type === 'loft_error' ||
                err.message?.includes('loft') ||
                err.message?.includes('More than one wire')
        )

        let contextualHints = ''
        if (context?.previousErrors) {
            contextualHints = `\n\n⚠️ LEARN FROM PREVIOUS ERRORS:\n`
            context.previousErrors.forEach((err: any, idx: number) => {
                contextualHints += `${idx + 1}. ${err.type}: ${err.message}\n`
            })
        }

        // SÉLECTION DU PROMPT
        if (lower.includes('drug') || lower.includes('stent') || lower.includes('implant')) {
            // 🔥 SI ERREUR LOFT DÉTECTÉE → UTILISER PROMPT SIMPLIFIÉ
            if (hasLoftError && (lower.includes('ellips') || lower.includes('reservoir'))) {
                console.log('🔄 Using SIMPLIFIED medical prompt due to loft errors')
                systemPrompt = SpecializedPrompts.getSimplifiedMedicalPrompt(prompt)
            } else {
                console.log('🏥 Using MEDICAL prompt')
                systemPrompt = SpecializedPrompts.getMedicalPrompt(prompt) + contextualHints
            }
        }
        else if (lower.includes('lattice') || lower.includes('gyroid') || lower.includes('voronoi')) {
            console.log('🔲 Using LATTICE prompt')
            systemPrompt = SpecializedPrompts.getLatticePrompt(prompt) + contextualHints
        }
        else if (lower.includes('actuator') || lower.includes('mckibben') || lower.includes('soft robot')) {
            console.log('🤖 Using ROBOTICS prompt')
            systemPrompt = this.getRoboticsPrompt(prompt) + contextualHints
        }
        else if (lower.includes('splint') || lower.includes('brace') || lower.includes('orthopedic')) {
            console.log('🦴 Using ORTHOPEDIC prompt')
            systemPrompt = this.getOrthopedicPrompt(prompt) + contextualHints
        }
        else {
            console.log('📝 Using GENERAL prompt')
            systemPrompt = SpecializedPrompts.getGeneralPrompt(prompt) + contextualHints
        }

        try {
            if (!this.useAnthropic) {
                return await this.generateWithOllama(systemPrompt)
            } else {
                return await this.generateWithAnthropic(systemPrompt)
            }
        } catch (error: any) {
            console.error('❌ LLM failed:', error.message)
            return this.generateFallback(prompt)
        }
    }



    private async generateWithOllama(systemPrompt: string): Promise<string> {
        // systemPrompt est déjà construit
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

    private async generateWithAnthropic(systemPrompt: string): Promise<string> {
        if (!this.anthropicKey) {
            throw new Error('Anthropic API key not configured')
        }

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

    // Ajouter APRÈS la méthode improveCode() existante

    async improveCodeWithFeedback(code: string, error: string, errorType: string): Promise<string> {
        console.log(`🔧 LLM: Attempting to fix ${errorType} error...`)

        let specificGuidance = ''

        // Guidance spécifique selon le type d'erreur
        switch (errorType) {
            case 'geometric_invalid':
                specificGuidance = `
ERROR TYPE: Geometric operation failed (BRep error)

COMMON CAUSES:
1. Fillet radius too large: Ensure fillet radius < wall thickness
2. Invalid boolean operation: Shapes don't overlap properly
3. Near-zero dimensions: All dimensions must be positive floats

FIXES:
- Check all fillet operations: radius must be smaller than adjacent feature
- For boolean operations, ensure shapes actually intersect
- Convert all numbers to floats: 10.0 not 10
- Add tolerance to unions: .union(other, tol=0.0001)
`
                break

            case 'invalid_api_usage':
                specificGuidance = `
ERROR TYPE: Invalid CadQuery API usage

COMMON CAUSES:
1. Using unsupported parameters (angleDegrees, etc.)
2. Wrong method signature
3. Obsolete API from old CadQuery version

❌ COMMON MISTAKES:
- .workplane(angleDegrees=45)  # NOT SUPPORTED
- .rotate(angle=30)  # Wrong parameter name
- Old API methods

✅ CORRECT USAGE:
- .workplane(offset=10.0)  # Simple offset
- .rotate((0,0,0), (0,0,1), 30)  # Full rotate syntax
- .center(x, y)  # Position on workplane

FOR STENTS - ULTRA SIMPLE PATTERN:
\`\`\`python
import cadquery as cq
import math

length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
result = None

# Simple vertical struts in ring pattern
for ring_idx in range(rings):
    z = ring_idx * ring_spacing
    
    for i in range(12):  # 12 points per ring
        angle = math.radians((360.0 / 12) * i)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        
        # Single vertical strut
        strut = (cq.Workplane("XY")
            .workplane(offset=z)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(ring_spacing * 0.5))
        
        result = result.union(strut) if result else strut

show_object(result)
\`\`\`

KEY: Keep it SIMPLE. No complex API calls.
`
                break


            case 'unclosed_wire':
                specificGuidance = `
ERROR TYPE: Wire is not closed

FIX: Add .close() after all 2D sketch operations
Example:
BAD:  .lineTo(10, 0).lineTo(10, 10).lineTo(0, 10)
GOOD: .lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close()
`
                break

            case 'fillet_error':
                specificGuidance = `
ERROR TYPE: Fillet operation failed

CAUSE: Fillet radius is too large for the edge
FIX: Reduce fillet radius to < half of smallest adjacent dimension
Example: For 5mm wall, use .fillet(2.0) maximum
`
                break

            case 'non_planar_wire':
                specificGuidance = `
ERROR TYPE: Non-planar wires - Cannot build face from 3D wires

CAUSE: Trying to create a face from wires that are not in the same plane
COMMON IN: Stents, helical patterns, 3D curves

❌ WRONG APPROACH:
- Creating 3D wire path (zigzag around cylinder)
- Trying .extrude() on non-planar wire
- Using .loft() with 3D paths

✅ CORRECT APPROACH FOR STENTS:
Use individual struts (small cylinders) method:

\`\`\`python
import cadquery as cq
import math

# Parameters
length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
result = None

# Create zigzag rings using individual struts
points_per_ring = 16

for ring_idx in range(rings):
    z_pos = ring_idx * ring_spacing
    
    for i in range(points_per_ring):
        angle = (360.0 / points_per_ring) * i
        next_angle = (360.0 / points_per_ring) * ((i + 1) % points_per_ring)
        
        # Zigzag: alternating radius
        r1 = radius if i % 2 == 0 else radius * 0.85
        r2 = radius * 0.85 if i % 2 == 0 else radius
        
        x1 = r1 * math.cos(math.radians(angle))
        y1 = r1 * math.sin(math.radians(angle))
        x2 = r2 * math.cos(math.radians(next_angle))
        y2 = r2 * math.sin(math.radians(next_angle))
        
        # Create strut as small cylinder between points
        dx = x2 - x1
        dy = y2 - y1
        dz = 0.1
        
        strut = (cq.Workplane("XY")
            .center(x1, y1)
            .workplane(offset=z_pos)
            .circle(strut_thickness / 2.0)
            .extrude(0.5))  # Small height
        
        result = result.union(strut) if result else strut

show_object(result)
\`\`\`

KEY POINTS:
1. Build stent from individual struts (small cylinders)
2. Calculate 3D positions using trigonometry
3. Use .union() to combine struts
4. NO .extrude() on 3D wires!
`
                break

            case 'boolean_operation':
                specificGuidance = `
ERROR TYPE: Boolean operation (union/cut) failed

FIXES:
1. Add tolerance: .union(other, tol=0.0001)
2. Use .fuse() instead of .union()
3. Ensure shapes actually overlap/intersect
4. Check that all dimensions are positive floats
`
                break

            case 'loft_error':
                specificGuidance = `
ERROR TYPE: Loft operation failed

CAUSE: .loft() requires at least 2 sections/profiles
FIX: Use workplane chain method

CORRECT PATTERN:
result = (cq.Workplane("XY")
    .circle(10.0)           # Section 1
    .workplane(offset=20.0)
    .circle(8.0)            # Section 2
    .workplane(offset=20.0)
    .circle(5.0)            # Section 3
    .loft())                # Now loft works!

NEVER DO THIS:
sections = []
sections.append(...)  # ❌ WRONG
result = sections[0].loft(...)  # ❌ WRONG SYNTAX
`
                break

            case 'timeout':
                specificGuidance = `
ERROR TYPE: Execution timed out

CAUSE: Too many boolean operations or small lattice cells

FIXES:
1. For lattices: Increase unit_cell_size to 10.0mm minimum
2. Reduce number of cells: max 10x10x10
3. Simplify geometry: fewer features
4. Use arrays instead of loops
`
                break

            default:
                specificGuidance = 'Check CadQuery syntax and ensure all parameters are floats'
        }

        const fixPrompt = `This CadQuery code has an error. Fix it and return ONLY the corrected code.

${specificGuidance}

ACTUAL ERROR: ${error}

ORIGINAL CODE:
${code}

REQUIREMENTS:
1. Fix the specific error mentioned above
2. Ensure ALL numbers are floats (10.0 not 10)
3. Start with: import cadquery as cq
4. End with: show_object(result)
5. Keep the overall structure but fix the issue

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
                            num_predict: 1000
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
            return code
        }
    }
    private getRoboticsPrompt(prompt: string): string {
        return `You are an expert CadQuery programmer for SOFT ROBOTICS and ACTUATORS.

🎯 KEY PRINCIPLES FOR SOFT ROBOTICS:
1. Smooth surfaces (no sharp edges)
2. Flexible sections with thin walls (0.5-2mm)
3. Actuatable chambers or bellows
4. Avoid excessive boolean operations (causes timeout)

✅ OPTIMIZED PATTERN - Simplified McKibben Actuator:
\`\`\`python
import cadquery as cq
import math

# Parameters
length = 100.0
diameter = 20.0
filament_count = 12  # Reduced for performance
filament_thickness = 0.5

radius = diameter / 2.0

# Main body
body = cq.Workplane("XY").circle(radius).extrude(length)

# Bladder cavity
bladder = cq.Workplane("XY").circle(radius - 2.0).extrude(length - 4.0).translate((0, 0, 2.0))
body = body.cut(bladder)

# Helical filaments (use sweep, not individual segments)
pitch = length / 3.0

for i in range(filament_count):
    angle_offset = (360.0 / filament_count) * i
    
    # Create helical path (30 segments)
    points = []
    for j in range(31):
        t = j / 30.0
        z = t * length
        angle = angle_offset + (t * 360.0 * 3.0)
        x = radius * math.cos(math.radians(angle))
        y = radius * math.sin(math.radians(angle))
        points.append((x, y, z))
    
    path = cq.Workplane("XY").spline(points)
    filament = cq.Workplane("YZ").circle(filament_thickness/2.0).sweep(path)
    body = body.union(filament)

# End caps
cap = cq.Workplane("XY").circle(radius + 1.0).extrude(3.0)
body = body.union(cap)
body = body.union(cap.translate((0, 0, length - 3.0)))

show_object(body)
\`\`\`

⚠️ PERFORMANCE TIPS:
- Limit filament count: 12-16 maximum (not 45!)
- Use sweep() for helical paths, not loops
- Simplify cavity geometry
- Avoid small features (<0.5mm)

Now generate code for: "${prompt}"

Return ONLY Python code optimized for performance.`
    }

    private getOrthopedicPrompt(prompt: string): string {
        return `You are an expert CadQuery programmer for ORTHOPEDIC DEVICES.

🎯 KEY PRINCIPLES FOR ORTHOPEDICS:
1. Anatomically curved surfaces (loft or spline-based)
2. Ventilation holes for comfort
3. Strap/mounting points
4. Smooth edges (minimum 1mm fillet)

✅ OPTIMIZED PATTERN - Wrist Splint:
\`\`\`python
import cadquery as cq

# Parameters
length = 180.0
width = 70.0
thickness = 3.0
palm_angle = 15.0

# Base (forearm section)
base = cq.Workplane("XY").box(length * 0.6, width, thickness)

# Palm section (angled)
palm = (cq.Workplane("XY")
    .workplane(offset=thickness)
    .box(length * 0.4, width, thickness * 4.0)
    .rotate((0, 0, 0), (1, 0, 0), palm_angle)
    .translate((length * 0.25, 0, 0)))

result = base.union(palm)

# Ventilation holes
result = (result
    .faces(">Z")
    .workplane()
    .rarray(15.0, 15.0, 6, 3)
    .circle(3.0)
    .cutThruAll())

# Strap slots
for i in range(3):
    slot_x = -length * 0.25 + i * length * 0.25
    slot = (cq.Workplane("XY")
        .center(slot_x, 0)
        .rect(8.0, width * 0.9)
        .cutThruAll())
    result = result.cut(slot)

# Smooth all edges
try:
    result = result.edges().fillet(1.0)
except:
    pass

show_object(result)
\`\`\`

⚠️ IMPORTANT:
- Use simple geometry (avoid complex lofts if possible)
- Large ventilation holes (5mm+) for performance
- Limit fillet operations
- Test printability (no overhangs >45°)

Now generate code for: "${prompt}"

Return ONLY Python code.`
    }

}