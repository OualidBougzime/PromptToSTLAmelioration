export class SpecializedPrompts {
    static getMedicalPrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for MEDICAL DEVICES.

CRITICAL RULES:
- Start with: import cadquery as cq
- End with: show_object(result)
- Wall thickness MINIMUM 1mm
- All edges must be smooth (fillet 0.3mm)
- NEVER use .workplane() after .faces() on spheres

WORKING EXAMPLE - Drug Delivery Capsule:
\`\`\`python
import cadquery as cq
import math

# Parameters
body_length = 20
body_diameter = 8
wall_thickness = 1
channel_count = 12
channel_diameter = 0.5

radius = body_diameter / 2

# Main body
body = cq.Workplane("XY").circle(radius).extrude(body_length)

# Hemispherical caps (CORRECT METHOD - use translate)
cap_bottom = cq.Workplane("XY").sphere(radius).translate((0, 0, -radius))
cap_top = cq.Workplane("XY").sphere(radius).translate((0, 0, body_length + radius))

result = body.union(cap_bottom).union(cap_top)

# Internal cavity
cavity_radius = radius - wall_thickness
cavity_length = body_length - 2 * wall_thickness
cavity = cq.Workplane("XY").workplane(offset=wall_thickness).circle(cavity_radius).extrude(cavity_length)
result = result.cut(cavity)

# Micro-channels around circumference
for i in range(channel_count):
    angle_rad = math.radians((360.0 / channel_count) * i)
    x = radius * math.cos(angle_rad)
    y = radius * math.sin(angle_rad)
    channel = cq.Workplane("XY").workplane(offset=body_length/2).center(x, y).circle(channel_diameter/2).extrude(wall_thickness+2)
    result = result.cut(channel)

# Optional: threaded interface
thread_ring = cq.Workplane("XY").workplane(offset=body_length/2-1).circle(radius+0.5).circle(radius-0.2).extrude(2)
result = result.union(thread_ring)

# Smooth edges
try:
    result = result.edges("|Z").fillet(0.3)
except:
    pass

show_object(result)
\`\`\`

IMPORTANT PATTERNS:
1. Hemispherical caps: Use .sphere().translate() NOT .sphere().faces().workplane()
2. Channels: Use .center(x, y) for positioning
3. Always use try/except for fillet operations
4. Use math.radians() for angle conversions

Now generate code for: ${userPrompt}

Return ONLY the Python code in \`\`\`python blocks.`
    }

    static getLatticePrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer for LATTICE STRUCTURES.

EXAMPLE - Gyroid Lattice:
\`\`\`python
import cadquery as cq

size = 50
unit_cell = 5
thickness = 0.8

cells = int(size / unit_cell)
result = None

for i in range(cells):
    for j in range(cells):
        for k in range(cells):
            x = i * unit_cell
            y = j * unit_cell
            z = k * unit_cell
            
            phase = (i + j + k) % 3
            
            if phase == 0:
                strut = cq.Workplane("XY").center(x, y).workplane(offset=z).circle(thickness/2).extrude(unit_cell*1.41)
                result = result.union(strut) if result else strut

bbox = cq.Workplane("XY").box(size, size, size)
result = result.intersect(bbox)
show_object(result)
\`\`\`

Now generate code for: ${userPrompt}
Return ONLY Python code.`
    }

    static getGeneralPrompt(userPrompt: string): string {
        return `You are an expert CadQuery programmer.

CRITICAL: NEVER use .fillet() on .ellipse()

Generate code for: ${userPrompt}

Rules:
- Start with: import cadquery as cq
- End with: show_object(result)
- Use clear variable names

Return ONLY Python code.`
    }
}