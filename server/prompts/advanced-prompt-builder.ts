// server/prompts/advanced-prompt-builder.ts
/**
 * Système de construction de prompts INTELLIGENT
 * Avec bibliothèque d'exemples concrets pour chaque catégorie
 */
export class AdvancedPromptBuilder {

    /**
     * Bibliothèque complète d'exemples WORKING CODE
     */
    private static EXAMPLES_LIBRARY = {

        // ========================================
        // MEDICAL - STENTS
        // ========================================
        stent_simple: `
🔥 VASCULAR STENT - PROVEN METHOD:

\`\`\`python
import cadquery as cq
import math

# Parameters (ADAPT THESE)
length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8

radius = diameter / 2.0
ring_spacing = length / rings
result = None

# Build from individual struts
for ring_idx in range(rings):
    z = ring_idx * ring_spacing
    
    for i in range(12):
        angle = math.radians((360.0 / 12) * i)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        
        strut = (cq.Workplane("XY")
            .workplane(offset=z)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(ring_spacing * 0.6))
        
        result = result.union(strut) if result else strut

# Add connecting bridges
for i in range(3):
    angle = math.radians((360.0 / 3) * i)
    x = (radius * 0.9) * math.cos(angle)
    y = (radius * 0.9) * math.sin(angle)
    
    bridge = (cq.Workplane("XY")
        .center(x, y)
        .circle(strut_thickness / 2.0)
        .extrude(length))
    
    result = result.union(bridge)

show_object(result)
\`\`\`

KEY PRINCIPLES:
✅ Individual struts (cylinders)
✅ Math-based positioning
✅ Union incrementally
❌ NO 3D wire extrusion
`,

        // ========================================
        // MEDICAL - SOFT ACTUATORS
        // ========================================
        soft_actuator: `
🔥 PNEUMATIC SOFT ACTUATOR - SIMPLIFIED:

\`\`\`python
import cadquery as cq

# Parameters (ADAPT)
body_length = 60.0
body_width = 15.0
body_height = 10.0
wall = 1.5
chambers = 6

# Main body
body = cq.Workplane("XY").box(body_length, body_width, body_height)

# Create chambers as simple cuts
chamber_width = 8.0
chamber_spacing = body_length / chambers

for i in range(chambers):
    x_pos = (i * chamber_spacing) - (body_length / 2.0) + chamber_spacing / 2.0
    
    chamber = (cq.Workplane("XY")
        .workplane(offset=wall)
        .center(x_pos, 0)
        .box(chamber_width, chamber_width, body_height - 2.0 * wall))
    
    body = body.cut(chamber)

# Pneumatic input port
port = (cq.Workplane("XY")
    .faces(">Z")
    .workplane()
    .center(-body_length / 2.0 + 5.0, 0)
    .circle(1.5)
    .extrude(3.0))

result = body.union(port)

show_object(result)
\`\`\`

KEY: Chambers = simple rectangular cuts!
`,

        // ========================================
        // MEDICAL - SPLINTS & BRACES
        // ========================================
        wrist_splint: `
🔥 WRIST SPLINT - SIMPLE CURVED STRUCTURE:

\`\`\`python
import cadquery as cq

# Parameters (ADAPT)
length = 180.0
width = 70.0
thickness = 3.0
palm_angle = 15.0

# Forearm section (flat)
forearm = cq.Workplane("XY").box(length * 0.6, width, thickness)

# Palm section (angled)
palm_length = length * 0.4
palm = (cq.Workplane("XY")
    .workplane(offset=thickness)
    .box(palm_length, width, thickness * 3.0)
    .rotate((0, 0, 0), (1, 0, 0), palm_angle)
    .translate((length * 0.25, 0, 0)))

result = forearm.union(palm)

# Ventilation holes (pattern)
hole_spacing = 15.0
holes_x = int(length * 0.5 / hole_spacing)
holes_y = int(width * 0.6 / hole_spacing)

holes = (cq.Workplane("XY")
    .rarray(hole_spacing, hole_spacing, holes_x, holes_y)
    .circle(3.0)
    .extrude(thickness * 2.0))

result = result.cut(holes)

# Strap slots (3 positions)
for i in range(3):
    slot_x = -length * 0.25 + i * length * 0.25
    slot = (cq.Workplane("XY")
        .workplane(offset=thickness / 2.0)
        .center(slot_x, 0)
        .rect(8.0, width * 0.9)
        .cutThruAll())
    result = result.cut(slot)

show_object(result)
\`\`\`

KEY: Two boxes united + cuts for features
`,

        // ========================================
        // LATTICE STRUCTURES
        // ========================================
        lattice_gyroid: `
🔥 GYROID LATTICE - PERFORMANCE OPTIMIZED:

\`\`\`python
import cadquery as cq

# Parameters (ADAPT)
size = 50.0
unit_cell = 10.0  # ⚠️ MUST be >= 10mm!
thickness = 0.8

cells = int(size / unit_cell)
result = None

# Phase-based strut generation
for i in range(cells):
    for j in range(cells):
        for k in range(cells):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            # Gyroid-like phase selection
            phase = (i + j + k) % 3
            
            if phase == 0:
                # Vertical strut
                strut = (cq.Workplane("XY")
                    .center(x, y)
                    .circle(thickness / 2.0)
                    .extrude(unit_cell))
                result = result.union(strut) if result else strut
            elif phase == 1:
                # Horizontal strut (X)
                strut = (cq.Workplane("YZ")
                    .workplane(offset=x)
                    .center(y, z)
                    .circle(thickness / 2.0)
                    .extrude(unit_cell))
                result = result.union(strut) if result else strut

# Trim to bounding box
bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

show_object(result)
\`\`\`

⚠️ CRITICAL: unit_cell >= 10mm or TIMEOUT!
`,

        voronoi_scaffold: `
🔥 VORONOI-STYLE POROUS SCAFFOLD - SIMPLIFIED:

\`\`\`python
import cadquery as cq
import math

# Parameters
diameter = 40.0
height = 30.0
strut_thickness = 1.5
cells = 8  # Simplified grid

radius = diameter / 2.0
cell_size = diameter / cells
result = None

# Create pseudo-Voronoi using radial struts
for layer in range(int(height / cell_size)):
    z = layer * cell_size
    
    # Radial struts at this layer
    for i in range(cells * 2):
        angle = (360.0 / (cells * 2)) * i
        r = radius * (0.5 + 0.5 * (layer % 2))
        
        x = r * math.cos(math.radians(angle))
        y = r * math.sin(math.radians(angle))
        
        strut = (cq.Workplane("XY")
            .workplane(offset=z)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(cell_size))
        
        result = result.union(strut) if result else strut

# Trim to cylinder
cylinder = cq.Workplane("XY").circle(radius).extrude(height)
result = result.intersect(cylinder)

# Add base plate
base = cq.Workplane("XY").circle(radius).extrude(3.0)
result = result.union(base)

show_object(result)
\`\`\`

KEY: Simplified radial pattern, not true Voronoi
`,

        // ========================================
        // COMPLIANT MECHANISMS
        // ========================================
        compliant_gripper: `
🔥 COMPLIANT GRIPPER - LIVING HINGE:

\`\`\`python
import cadquery as cq

# Parameters
jaw_length = 60.0
jaw_width = 10.0
jaw_thickness = 3.0
hinge_thickness = 0.5
base_size = 30.0

# Base plate
base = cq.Workplane("XY").box(base_size, base_size, 5.0)

# Left jaw
left_jaw = (cq.Workplane("XY")
    .workplane(offset=5.0)
    .center(-base_size / 2.0 - jaw_length / 2.0, 0)
    .box(jaw_length, jaw_width, jaw_thickness))

# Right jaw
right_jaw = (cq.Workplane("XY")
    .workplane(offset=5.0)
    .center(base_size / 2.0 + jaw_length / 2.0, 0)
    .box(jaw_length, jaw_width, jaw_thickness))

# Living hinges (thin flexures)
left_hinge = (cq.Workplane("XY")
    .workplane(offset=5.0)
    .center(-base_size / 2.0, 0)
    .box(hinge_thickness, jaw_width, jaw_thickness))

right_hinge = (cq.Workplane("XY")
    .workplane(offset=5.0)
    .center(base_size / 2.0, 0)
    .box(hinge_thickness, jaw_width, jaw_thickness))

# Combine
result = base.union(left_jaw).union(right_jaw)
result = result.union(left_hinge).union(right_hinge)

# Mounting holes in base
result = (result
    .faces("<Z")
    .workplane()
    .rarray(20.0, 20.0, 2, 2)
    .circle(2.0)
    .cutThruAll())

show_object(result)
\`\`\`

KEY: Separate rigid parts + thin flexure hinges
`,

        bistable_mechanism: `
🔥 BISTABLE SNAP MECHANISM - SIMPLIFIED:

\`\`\`python
import cadquery as cq

# Parameters
beam_length = 80.0
beam_width = 10.0
beam_thickness = 3.0
curve_rise = 15.0

# Create curved beam using loft
result = (cq.Workplane("XY")
    .rect(beam_width, beam_thickness)
    .workplane(offset=beam_length / 4.0)
    .center(0, curve_rise / 2.0)
    .rect(beam_width, beam_thickness)
    .workplane(offset=beam_length / 4.0)
    .center(0, curve_rise)
    .rect(beam_width, beam_thickness)
    .workplane(offset=beam_length / 4.0)
    .center(0, curve_rise / 2.0)
    .rect(beam_width, beam_thickness)
    .workplane(offset=beam_length / 4.0)
    .rect(beam_width, beam_thickness)
    .loft())

# Add mounting tabs at ends
tab = cq.Workplane("XY").box(beam_width * 2.0, beam_width * 2.0, beam_thickness)
result = result.union(tab)
result = result.union(tab.translate((0, 0, beam_length)))

show_object(result)
\`\`\`

KEY: Loft with controlled curve for bistability
`,

        // ========================================
        // MICROFLUIDICS
        // ========================================
        microfluidic_chip: `
🔥 MICROFLUIDIC MIXING CHIP - SERPENTINE:

\`\`\`python
import cadquery as cq

# Parameters
chip_length = 75.0
chip_width = 50.0
chip_thickness = 5.0
channel_width = 0.3
channel_depth = 0.2

# Base chip
chip = cq.Workplane("XY").box(chip_length, chip_width, chip_thickness)

# Serpentine channel (simplified - 4 loops)
channel_segments = []
y_start = -chip_width / 4.0
segment_length = chip_length / 5.0

# Create path using line segments
path_points = []
x = -chip_length / 2.0 + 10.0

for i in range(4):
    # Move right
    path_points.append((x, y_start))
    x += segment_length
    path_points.append((x, y_start))
    
    # Move up/down
    y_start = -y_start
    path_points.append((x, y_start))

# Create channel as swept rectangle
# Simplified: use rectangular cuts
for i in range(len(path_points) - 1):
    x1, y1 = path_points[i]
    x2, y2 = path_points[i + 1]
    
    # Approximate channel segment
    dx = x2 - x1
    dy = y2 - y1
    length = (dx**2 + dy**2)**0.5
    
    if length > 0:
        segment = (cq.Workplane("XY")
            .workplane(offset=chip_thickness - channel_depth)
            .center((x1 + x2) / 2.0, (y1 + y2) / 2.0)
            .box(length if abs(dx) > abs(dy) else channel_width,
                 channel_width if abs(dx) > abs(dy) else length,
                 channel_depth))
        chip = chip.cut(segment)

# Inlet/outlet ports
inlet = (cq.Workplane("XY")
    .faces(">Z")
    .workplane()
    .center(-chip_length / 2.0 + 5.0, 0)
    .circle(1.0)
    .extrude(2.0))

outlet = (cq.Workplane("XY")
    .faces(">Z")
    .workplane()
    .center(chip_length / 2.0 - 5.0, 0)
    .circle(1.0)
    .extrude(2.0))

result = chip.union(inlet).union(outlet)

show_object(result)
\`\`\`

KEY: Approximate serpentine with straight segments
`
    }

    /**
     * Règles CadQuery strictes
     */
    private static STRICT_RULES = `
🚨 CADQUERY 2.4 - ABSOLUTE RULES:

FORBIDDEN SYNTAX:
❌ .workplane(angleDegrees=...)
❌ .rotate(angle=...)
❌ .sphere().faces().workplane()
❌ sections = []; sections.append(...)
❌ 3D wire path + .extrude()

CORRECT SYNTAX:
✅ .workplane(offset=10.0)
✅ .center(x, y)
✅ .rotate((0,0,0), (0,0,1), 45)
✅ .translate((x, y, z))
✅ .circle().workplane(offset=z).circle().loft()

CRITICAL:
- ALL numbers MUST be floats: 25.0 not 25
- For complex shapes: Build from SIMPLE parts
- Union parts incrementally
- Cut features last
`

    /**
     * Construire prompt intelligent selon tentative
     */
    static buildPrompt(userPrompt: string, options: any = {}): string {
        const {
            previousErrors = [],
            attempt = 1
        } = options

        const category = this.detectCategory(userPrompt)

        if (attempt === 1) {
            return this.buildPrimaryPrompt(userPrompt, category, previousErrors)
        } else if (attempt === 2) {
            return this.buildSimplifiedPrompt(userPrompt, category, previousErrors)
        } else {
            return this.buildUltraSimplePrompt(userPrompt, previousErrors)
        }
    }

    /**
     * Prompt principal (tentative 1)
     */
    private static buildPrimaryPrompt(
        prompt: string,
        category: string,
        errors: string[],
        ragExamples: any[] = []  // ← NOUVEAU paramètre
    ): string {
        const errorContext = errors.length > 0
            ? `\n\n⚠️ PREVIOUS ERRORS TO AVOID:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n`
            : ''

        // 🔥 UTILISER RAG examples si disponibles
        const examples = ragExamples.length > 0
            ? ragExamples.map(ex => `\n--- RAG Example (${(ex.score * 100).toFixed(0)}% match) ---\n${ex.code}`).join('\n')
            : this.getExamplesForCategory(category).substring(0, 1500)

        return `You are an EXPERT CadQuery programmer.

${this.STRICT_RULES}

${errorContext}

🎯 USER REQUEST: "${prompt}"

📚 RELEVANT EXAMPLES:
${examples}

📋 INSTRUCTIONS:
1. Copy the example structure
2. Change ONLY the dimensions to match user request
3. Keep it SIMPLE - use proven patterns
4. All numbers as floats: 25.0 not 25

⚠️ CRITICAL:
- Maximum 50 lines of code
- Use ONLY patterns from examples
- NO complex features unless shown in example

Return ONLY Python code in \`\`\`python blocks. NO text before or after.`
    }

    /**
     * Prompt simplifié (tentative 2)
     */
    private static buildSimplifiedPrompt(prompt: string, category: string, errors: string[]): string {
        return `Generate ULTRA-SIMPLIFIED CadQuery code.

⚠️ PREVIOUS ATTEMPTS FAILED WITH:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

🎯 REQUEST: "${prompt}"

📋 EXTREME SIMPLIFICATION REQUIREMENTS:
1. Use ONLY: .box(), .cylinder(), .sphere()
2. Use ONLY: .union(), .cut()
3. Maximum 30 lines
4. NO loft, NO sweep, NO complex operations
5. Build placeholder that approximates the shape

EXAMPLE STRUCTURE:
\`\`\`python
import cadquery as cq

# Simplified approximation
body = cq.Workplane("XY").box(50.0, 30.0, 10.0)

# Simple feature
feature = cq.Workplane("XY").box(40.0, 20.0, 5.0)
result = body.cut(feature)

show_object(result)
\`\`\`

Generate WORKING simple code for: "${prompt}"

Return ONLY Python code in \`\`\`python blocks.`
    }

    /**
     * Prompt minimal (tentative 3)
     */
    private static buildUltraSimplePrompt(prompt: string, errors: string[]): string {
        return `Generate MINIMAL placeholder CadQuery code.

REQUIREMENTS:
- ONE basic shape only (.box() or .cylinder())
- Maximum 10 lines
- NO operations
- Just a placeholder

TEMPLATE:
\`\`\`python
import cadquery as cq
result = cq.Workplane("XY").box(30.0, 20.0, 10.0)
show_object(result)
\`\`\`

Create placeholder for: "${prompt}"

Return ONLY Python code.`
    }

    /**
     * Détecter catégorie du prompt
     */
    private static detectCategory(prompt: string): string {
        const lower = prompt.toLowerCase()

        // Medical
        if (lower.includes('stent')) return 'stent'
        if (lower.includes('actuator') || lower.includes('pneumatic') || lower.includes('soft robot')) return 'actuator'
        if (lower.includes('splint') || lower.includes('brace') || lower.includes('orthopedic')) return 'splint'

        // Lattice
        if (lower.includes('gyroid') || (lower.includes('lattice') && !lower.includes('voronoi'))) return 'lattice'
        if (lower.includes('voronoi') || lower.includes('porous') || lower.includes('scaffold')) return 'voronoi'

        // Mechanisms
        if (lower.includes('gripper') || lower.includes('compliant')) return 'gripper'
        if (lower.includes('bistable') || lower.includes('snap')) return 'bistable'

        // Microfluidics
        if (lower.includes('microfluidic') || lower.includes('channel') || lower.includes('serpentine')) return 'microfluidic'

        return 'general'
    }

    /**
     * Récupérer exemples pour une catégorie
     */
    private static getExamplesForCategory(category: string): string {
        const exampleMap: Record<string, string[]> = {
            'stent': ['stent_simple'],
            'actuator': ['soft_actuator'],
            'splint': ['wrist_splint'],
            'lattice': ['lattice_gyroid'],
            'voronoi': ['voronoi_scaffold'],
            'gripper': ['compliant_gripper'],
            'bistable': ['bistable_mechanism'],
            'microfluidic': ['microfluidic_chip'],
            'general': ['stent_simple', 'wrist_splint', 'soft_actuator']
        }

        const exampleKeys = exampleMap[category] || exampleMap['general']

        return exampleKeys
            .map(key => this.EXAMPLES_LIBRARY[key] || '')
            .filter(ex => ex.length > 0)
            .join('\n\n')
    }
}