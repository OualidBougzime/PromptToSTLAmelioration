// server/prompts/specialized-prompts.ts - VERSION FINALE CORRIGÉE

export class SpecializedPrompts {

    static getMedicalPrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for MEDICAL DEVICES.

🎯 IMPLEMENTATION STRATEGY (Chain-of-Thought):
1. Analyze user requirements → identify main component and features
2. Define coordinate system and dimensions as FLOAT variables
3. Create base geometry with explicit workplanes
4. Add functional features (channels, mounting points)
5. Apply safety features (fillets, smooth transitions)
6. Validate constraints and generate final code

🚨 CRITICAL CADQUERY RULES FOR MEDICAL DEVICES:
- ALWAYS use float literals: 20.0 NOT 20
- Start with: import cadquery as cq
- End with: show_object(result)
- For ellipsoids: use .loft() with workplane chain (NOT manual sections list)
- Use .translate() for positioning spheres, NOT .faces().workplane()
- Fillet radius MUST be < wall thickness
- Use .close() for 2D profiles
- NO .workplane(angleDegrees=...) - NOT SUPPORTED

✅ WORKING PATTERN - Ellipsoidal Drug Reservoir (CORRECTED):
\`\`\`python
import cadquery as cq

# Parameters
length = 30.0
width = 15.0
height = 10.0
wall_thickness = 2.0
membrane_thickness = 0.3
tab_length = 5.0
tab_width = 3.0
anchor_hole_dia = 1.0

# Step 1: Create ellipsoidal shape using workplane chain + loft
result = cq.Workplane("XY")
result = result.circle(width/2.0)

num_sections = 6
for i in range(1, num_sections):
    z_offset = length / (num_sections - 1)
    z_ratio = i / (num_sections - 1)
    t = (z_ratio - 0.5) * 2.0
    scale = (1.0 - t*t)**0.5
    
    if scale > 0.1:
        result = result.workplane(offset=z_offset).circle(width/2.0 * scale)

result = result.loft()

# Step 2: Internal chamber
chamber = cq.Workplane("XY")
chamber = chamber.workplane(offset=wall_thickness).circle((width/2.0 - wall_thickness))

chamber_sections = num_sections - 2
chamber_length = length - 2.0 * wall_thickness

for i in range(1, chamber_sections):
    z_offset = chamber_length / (chamber_sections - 1)
    z_ratio = i / (chamber_sections - 1)
    t = (z_ratio - 0.5) * 2.0
    scale = (1.0 - t*t)**0.5
    
    if scale > 0.1:
        chamber = chamber.workplane(offset=z_offset).circle((width/2.0 - wall_thickness) * scale)

chamber = chamber.loft()
result = result.cut(chamber)

# Step 3: Add surgical tab
tab = (cq.Workplane("XY")
    .workplane(offset=length)
    .center(0, width/4.0)
    .box(tab_length, tab_width, 2.0))
result = result.union(tab)

# Step 4: Anchor hole
anchor_hole = (cq.Workplane("XY")
    .workplane(offset=length + 1.0)
    .center(0, width/4.0)
    .circle(anchor_hole_dia/2.0)
    .extrude(3.0))
result = result.cut(anchor_hole)

show_object(result)
\`\`\`

✅ WORKING PATTERN - Vascular Stent (ULTRA-SIMPLIFIED):
\`\`\`python
import cadquery as cq
import math

# Vascular Stent Parameters
length = 25.0
diameter = 8.0
strut_thickness = 0.3
rings = 8
bridges = 3

radius = diameter / 2.0
ring_spacing = length / rings
result = None

# Step 1: Create strut rings - KEEP IT SIMPLE
points_per_ring = 12

for ring_idx in range(rings):
    z_pos = ring_idx * ring_spacing
    
    for i in range(points_per_ring):
        angle_deg = (360.0 / points_per_ring) * i
        angle_rad = math.radians(angle_deg)
        
        # Zigzag radius
        r = radius if i % 2 == 0 else radius * 0.85
        
        # Position
        x = r * math.cos(angle_rad)
        y = r * math.sin(angle_rad)
        
        # Single strut
        strut = (cq.Workplane("XY")
            .workplane(offset=z_pos)
            .center(x, y)
            .circle(strut_thickness / 2.0)
            .extrude(ring_spacing * 0.4))
        
        result = result.union(strut) if result else strut

# Step 2: Add longitudinal bridges
for bridge_idx in range(bridges):
    bridge_angle = math.radians((360.0 / bridges) * bridge_idx)
    x_bridge = (radius * 0.9) * math.cos(bridge_angle)
    y_bridge = (radius * 0.9) * math.sin(bridge_angle)
    
    bridge = (cq.Workplane("XY")
        .center(x_bridge, y_bridge)
        .circle(strut_thickness / 2.0)
        .extrude(length))
    
    result = result.union(bridge)

show_object(result)
\`\`\`

⚠️ STENT CRITICAL RULES:
1. ❌ NO .workplane(angleDegrees=...) - Parameter NOT supported
2. ❌ NO 3D wire paths and .extrude()
3. ✅ USE .workplane(offset=z) only
4. ✅ USE .center(x, y) for positioning
5. ✅ Calculate positions with math.cos/sin
6. ✅ Keep struts SHORT (.extrude(small_value))

⚠️ COMMON ERRORS TO AVOID:
1. ❌ .workplane(angleDegrees=30) → NOT SUPPORTED
2. ❌ sections = []; sections.append(...) → Use workplane chain
3. ❌ Using integers: radius = 10 → Use 10.0
4. ❌ .sphere().faces(">Z") → Use .sphere().translate()
5. ✅ .workplane(offset=10.0) → CORRECT
6. ✅ .center(x, y) → CORRECT

Now generate code for: "${userPrompt}"

Remember: KEEP IT SIMPLE. Use only basic CadQuery API.

Return ONLY Python code in \`\`\`python blocks.`
    }

    static getSimplifiedMedicalPrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer. The previous complex pattern failed.

🎯 USE SIMPLE CAPSULE METHOD (GUARANTEED TO WORK):

\`\`\`python
import cadquery as cq

# Parameters
length = 30.0
diameter = 15.0
wall = 2.0

radius = diameter / 2.0

# Main body
body = cq.Workplane("XY").circle(radius).extrude(length)

# Caps
cap_bottom = cq.Workplane("XY").sphere(radius).translate((0, 0, -radius))
cap_top = cq.Workplane("XY").sphere(radius).translate((0, 0, length + radius))

result = body.union(cap_bottom).union(cap_top)

# Cavity
cavity_radius = radius - wall
cavity_length = length - 2.0 * wall

cavity_body = (cq.Workplane("XY")
    .workplane(offset=wall)
    .circle(cavity_radius)
    .extrude(cavity_length))

cavity_cap_bottom = cq.Workplane("XY").sphere(cavity_radius).translate((0, 0, wall - cavity_radius))
cavity_cap_top = cq.Workplane("XY").sphere(cavity_radius).translate((0, 0, length - wall + cavity_radius))

cavity = cavity_body.union(cavity_cap_bottom).union(cavity_cap_top)
result = result.cut(cavity)

show_object(result)
\`\`\`

⚠️ CRITICAL RULES:
1. NO .loft()
2. NO .workplane(angleDegrees=...)
3. Use .union() and .cut() only
4. All dimensions MUST be floats: 10.0

Generate SIMPLE code for: "${userPrompt}"

Return ONLY Python code in \`\`\`python blocks.`
    }

    static getLatticePrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for LATTICE STRUCTURES.

🎯 LATTICE GENERATION STRATEGY:
1. Use LARGE unit cells (10mm+) to avoid timeout
2. Keep it SIMPLE - basic cubic lattice
3. Limit to max 10x10x10 cells

✅ WORKING PATTERN - Simple Cubic Lattice:
\`\`\`python
import cadquery as cq

# Parameters
size = 50.0
unit_cell = 10.0
thickness = 0.8

cells = int(size / unit_cell)
result = None

for i in range(cells + 1):
    for j in range(cells + 1):
        for k in range(cells + 1):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            if k < cells:
                strut = (cq.Workplane("XY")
                    .center(x, y)
                    .circle(thickness/2.0)
                    .extrude(unit_cell))
                result = result.union(strut) if result else strut

bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)

show_object(result)
\`\`\`

Generate code for: "${userPrompt}"

Return ONLY Python code.`
    }

    static getGeneralPrompt(userPrompt: string): string {
        return `You are an expert CadQuery code generator.

🎯 CRITICAL RULES:
1. Start with: import cadquery as cq
2. End with: show_object(result)
3. ALL numbers MUST be floats: 10.0 NOT 10
4. NO .workplane(angleDegrees=...)
5. Use .workplane(offset=10.0) only

✅ BASIC PATTERNS:

Box:
\`\`\`python
import cadquery as cq
result = cq.Workplane("XY").box(20.0, 10.0, 5.0)
show_object(result)
\`\`\`

Cylinder with hole:
\`\`\`python
import cadquery as cq
result = (cq.Workplane("XY")
    .circle(10.0)
    .extrude(20.0)
    .faces(">Z")
    .workplane()
    .circle(3.0)
    .cutThruAll())
show_object(result)
\`\`\`

Generate code for: "${userPrompt}"

Return ONLY Python code in \`\`\`python blocks.`
    }
}